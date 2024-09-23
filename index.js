const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const {UserModel, TodoModel} = require("./db");
const { z } = require('zod');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');

const port = process.env.PORT || 3000;
const mongourl = process.env.MONGO_URL;

mongoose.connect(mongourl);

const app = express();
app.use(express.json());

app.use(cors());

app.post("/signup", async function(req, res) {
    const requirebody = z.object({
        email: z.string().min(3).max(100).email(),
        password: z.string().min(3).max(100),
        name: z.string().min(3).max(100)
    })
    
    const parsedata = requirebody.safeParse(req.body);
    if(!parsedata.success) {
        res.json({
            message: "incorrect format",
            error: parsedata.error
        })
        return
    }
    
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;


    let errorThrown = false;
try {
    const hashedpassword = await bcrypt.hash(password, 5); 

    await UserModel.create({
        email: email,
        password: hashedpassword,
        name: name
    });
} catch(e) {
    res.json({
        message: "user already exists"
    })
    errorThrown = true;
}
    if(!errorThrown) {
    res.json({
        message: "You are signed up"
    })
}
});

app.post("/signin", async function(req, res) {
    const email = req.body.email;
    const password = req.body.password;

    const user = await UserModel.findOne({
        email: email,
    });

    if(!user) {
        res.json({
            message: "User does not exist"
        })
        return
    }

    const passwordmatch = await bcrypt.compare(password, user.password)

    if (passwordmatch) {
        const token = jwt.sign({
            id: user._id.toString()
        },process.env.SECRET_KEY)

        res.json({
            token
        })
    } else {
        res.json({
            message: "Incorrect creds"
        })
    }

});

function auth (req, res, next) {
    const token = req.headers.token
    const decodedinformation = jwt.verify(token, process.env.SECRET_KEY);
    if (decodedinformation) {
        req.userId = decodedinformation.id;
        next();
    } else {
        res.status(403).json({
            message: "you are not logged in"
        })
    }
}

app.post("/todo", auth, async function(req, res) {
    const userId = req.userId;
    const title = req.body.title;
    const mark = req.body.mark;

    const todo = await TodoModel.create({
        userId,
        title,
        mark
    });
    
    res.json({

        message: "todo created",
        todoId : todo._id
    })

});

app.put("/updatetodo/:id", auth, async function(req, res) {
    const todoId = req.params.id;
    const { title, mark } = req.body; 

    try {
        const updateFields = {};
        if (title !== undefined) updateFields.title = title;
        if (mark !== undefined) updateFields.mark = mark;

        const todo = await TodoModel.findByIdAndUpdate(todoId, updateFields, { new: true });

        if (!todo) {
            return res.status(404).json({ message: "Todo not found" });
        }

        res.json({
            message: "Todo updated",
            todo
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating todo" });
    }
});

app.delete("/todo/:id", auth, async function(req, res) {
    const todoId = req.params.id;

    try {
        const todo = await TodoModel.findByIdAndDelete(todoId);

        if (!todo) {
            return res.status(404).json({ message: "Todo not found" });
        }

        res.json({ message: "Todo deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting todo" });
    }
});

app.get("/todos", auth, async function(req, res) {
    const userId = req.userId;

    const todos = await TodoModel.find({
        userId
    });

    res.json({
        todos
    })
});


const url = `https://todo-app-f5ja.onrender.com/`; // Replace with your Render URL
const interval = 30000; // Interval in milliseconds (30 seconds)

function reloadWebsite() {
  axios.get(url)
    .then(response => {
      console.log(`Reloaded at ${new Date().toISOString()}: Status Code ${response.status}`);
    })
    .catch(error => {
      console.error(`Error reloading at ${new Date().toISOString()}:`, error.message);
    });
}


setInterval(reloadWebsite, interval);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
