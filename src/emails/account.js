const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const sendWelcomeEmail = (email, name) => {
    sgMail.send({
        from: 'mohammad_tashkandi@hotmail.com',
        to: email,
        subject: 'Welcome aboard the hype train',
        html: `<h1>Welcome ${name} to Task Manager</h1><h3>Where tasks finish faster</h3>`
    })
}

const sendCancellationEmail = (email, name) => {
    sgMail.send({
        from: 'mohammad_tashkandi@hotmail.com',
        to: email,
        subject: 'See you on the other side',
        html: `<h1>Goodbye ${name}, and thanks for the memories</h1><h3>Is there anything we could have done to keep you?</h3>`
    })
}

module.exports = {
    sendWelcomeEmail,
    sendCancellationEmail
}