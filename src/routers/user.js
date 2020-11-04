const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const auth = require('../middleware/auth')
const UserModel = require('../models/user')
const { sendWelcomeEmail, sendCancellationEmail } = require('../emails/account')

const router = new express.Router()
const avatarUpload = multer({
    limits: {
        fileSize: 1000000,
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Please provide an image with following extensions: jpg, jpeg, png'))
        }

        cb(null, true)
    }
})

router.post('/users', async (req, res) => {
    const { name, email, password, age } = req.body
    const user = new UserModel({
        name,
        email,
        password,
        age
    })

    try {
        await user.save()
        sendWelcomeEmail(user.email, user.name)
        const token = await user.generateAuthToken()
        res.status(201).send({ user, token })
    } catch (e) {
        res.status(400).send('An error has occured while creating user: ' + e)
    }
})

router.post('/users/login', async (req, res) => {
    const { email, password } = req.body
    try {
        const user = await UserModel.findByCredentials(email, password)
        const token = await user.generateAuthToken()
        res.send({ user, token })
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((tokenObj) => tokenObj.token !== req.token)

        await req.user.save()

        res.send()
    } catch (e) {
        res.status(500).send(e.message)
    }
})

router.post('/users/logoutAll', auth, async(req, res) => {
    try {
        req.user.tokens = []

        await req.user.save()

        res.send()
    } catch (e) {
        res.status(500).send(e.message)
    }
})

router.get('/users/me', auth, async (req, res) => {
    res.send(req.user)
})

router.patch('/users/me', auth, async (req, res) => {
    const ops = Object.keys(req.body)
    const validOps = ['name', 'age', 'email', 'password']
    const isValidOp = ops.every((operation) => validOps.includes(operation))

    if (!isValidOp) {
        return res.status(400).send({ error: 'Thats an invalid operation' })
    }

    try {
        ops.forEach((operation) => req.user[operation] = req.body[operation])

        await req.user.save()

        res.send(req.user)
    } catch (e) {
        res.status(400).send(e)
    }
})

router.delete('/users/me', auth, async (req, res) => {
    try {
        await req.user.remove()
        sendCancellationEmail(req.user.email, req.user.name)
        res.send(req.user)
    } catch (e) {
        res.status(500).send(e.message)
    }
})

// .single('avatar') -> what this means is in the request, this function will look for the form-data field with name: avatar
router.post('/users/me/avatar', auth, avatarUpload.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
    req.user.avatar = buffer
    await req.user.save()
    res.send()
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

router.delete('/users/me/avatar', auth, async (req, res) => {
    try {
        req.user.avatar = undefined
        await req.user.save()
        res.send()
    } catch (e) {
        res.status(500).send({ error: e.message })
    }
})

router.get('/users/:id/avatar', auth, async (req, res) => {
    try {
        const user = await UserModel.findById(req.params.id)

        if (!user || !user.avatar) {
            throw new Error()
        }

        res.set('Content-Type', 'image/png')
        res.send(user.avatar)
    } catch (e) {
        res.status(404).send()
    }
})


module.exports = router