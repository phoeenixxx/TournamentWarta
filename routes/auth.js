const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');

router.post('/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const token = Math.random().toString(36).substring(2);
    
    await User.create({ firstName, lastName, email, password: hashedPassword, confirmationToken: token });
    // In real app, send email here with link: /auth/confirm/token [cite: 9]
    res.send('Registration successful. Please check your email.');
});

router.post('/login', async (req, res) => {
    const user = await User.findOne({ where: { email: req.body.email, isActive: true } });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        req.session.userId = user.id;
        return res.redirect('/tournaments');
    }
    res.send('Invalid credentials or account not active.');
});

module.exports = router;