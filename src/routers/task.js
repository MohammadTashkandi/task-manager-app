const express = require('express')
const auth = require('../middleware/auth')
const TaskModel = require('../models/task')

const router = new express.Router()

router.post('/tasks', auth, async (req, res) => {
    const task = new TaskModel({
        ...req.body,
        owner: req.user._id
    })

    try {
        await task.save()
        res.status(201).send(task)
    } catch (e) {
        res.status(400).send('An error has occured while creating task: ' + e)
    }
})

router.get('/tasks', auth, async (req, res) => {
    const match = {}
    const sort = {}
    
    if (req.query.completed) {
        match.completed = req.query.completed === 'true'
    }
    
    if (req.query.sortBy) {
        const [field, order] = req.query.sortBy.split(':')
        sort[field] = order === 'desc' ? -1 : 1
    }

    try {
        // Both aproaches below work, the uncommented uses the virtual field on the user field

        // const tasks = await TaskModel.find({ owner: req.user._id })
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort,
            }
        }).execPopulate()

        const tasks = req.user.tasks

        if (tasks.length === 0) {
            return res.status(404).send('There are no tasks yet.')
        }
        res.send(tasks)
    } catch (e) {
        res.status(500).send('An error has occured while retreiving tasks: ' + e)
    }
})

router.get('/tasks/:id', auth, async (req, res) => {
    const { id } = req.params

    try {
        const task = await TaskModel.findOne({ _id: id, owner: req.user._id })
        if (!task) {
            return res.status(404).send('Task not found')
        }

        res.send(task)
    } catch (e) {
        res.status(500).send('An error has occured while retreiving task: ' + e)
    }
})

router.patch('/tasks/:id', auth, async (req, res) => {
    const { id } = req.params

    const ops = Object.keys(req.body)
    const validOps = ['description', 'completed']
    const isValidOp = ops.every((operation) => validOps.includes(operation))

    if (!isValidOp) {
        return res.status(400).send({ error: 'Invalid update' })
    }

    try {
        const task = await TaskModel.findOne({ _id: id, owner: req.user._id })

        if (!task) {
            return res.status(404).send()
        }

        ops.forEach((operation) => task[operation] = req.body[operation])

        await task.save()

        res.send(task)
    } catch (e) {
        res.status(400).send(e)
    }
})

router.delete('/tasks/:id', auth, async (req, res) => {
    const { id } = req.params

    try {
        const task = await TaskModel.findOneAndDelete({ _id: id, owner: req.user._id })

        if (!task) {
            return res.status(404).send()
        }

        res.send(task)
    } catch (e) {
        res.status(500).send(e)
    }
})

module.exports = router