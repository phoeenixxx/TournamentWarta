const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const { sequelize, User, Tournament, Participant, Match } = require('./models');

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'warta-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
    res.locals.user = req.session.userId || null;
    next();
});

let pollVotes = { yes: 0, no: 0 };

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: '',
        pass: ''
    }
});

app.get('/', (req, res) => res.redirect('/tournaments'));

app.get('/auth/register', (req, res) => res.render('register'));
app.post('/auth/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 12);
        const token = Math.random().toString(36).substring(2);
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);

        const newUser = await User.create({ 
            ...req.body, 
            password: hashedPassword, 
            confirmationToken: token, 
            confirmationTokenExpiry: expiry, 
            isActive: false 
        });

        const confirmationLink = `http://localhost:3001/auth/confirm/${token}`;
        
        await transporter.sendMail({
            from: '"Warta Arena"',
            to: req.body.email,
            subject: "Confirm your account - Warta Arena",
            html: `<h3>Welcome to Warta Arena!</h3><p>Please confirm your account by clicking the link below:</p><a href="${confirmationLink}">Confirm Account</a><br><p>Link expires in 24 hours.</p>`
        });

        res.render('login', { msg: `Registration successful! Verification email sent to ${req.body.email}.` });

    } catch (err) { 
        console.error(err);
        res.render('register', { error: "Registration failed. Email might be in use." }); 
    }
});

app.get('/auth/confirm/:token', async (req, res) => {
    const user = await User.findOne({ where: { confirmationToken: req.params.token } });
    if(user) {
        if(new Date() > new Date(user.confirmationTokenExpiry)) return res.render('login', { error: "Token expired. Please register again." });
        user.isActive = true; user.confirmationToken = null; user.confirmationTokenExpiry = null;
        await user.save(); 
        res.render('login', { msg: 'Account confirmed. Please log in.' }); 
    } else res.render('login', { error: 'Invalid or expired confirmation token.' });
});

app.get('/auth/login', (req, res) => res.render('login'));
app.post('/auth/login', async (req, res) => {
    const user = await User.findOne({ where: { email: req.body.email } });
    if(user && await bcrypt.compare(req.body.password, user.password)) {
        if(!user.isActive) return res.render('login', { error: 'Account not active. Please check your email.' });
        req.session.userId = user.id;
        res.redirect('/tournaments');
    } else res.render('login', { error: 'Invalid credentials. User does not exist or password is wrong.' });
});

app.get('/auth/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

app.get('/auth/forgot-password', (req, res) => res.render('forgot-password'));
app.post('/auth/forgot-password', async (req, res) => {
    const user = await User.findOne({ where: { email: req.body.email } });
    if(!user) return res.render('forgot-password', { error: 'User with this email does not exist.' });
    
    user.resetToken = crypto.randomBytes(32).toString('hex');
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();

    const resetLink = `http://localhost:3001/auth/reset-password/${user.resetToken}`;
    
    await transporter.sendMail({
        from: '"Warta Arena"',
        to: user.email,
        subject: "Password Reset - Warta Arena",
        html: `<h3>Password Reset</h3><p>Click the link below to reset your password:</p><a href="${resetLink}">Reset Password</a><br><p>Link expires in 1 hour.</p>`
    });

    res.render('login', { msg: 'Reset link sent to your email.' });
});

app.get('/auth/reset-password/:token', (req, res) => res.render('reset-password', { token: req.params.token }));
app.post('/auth/reset-password/:token', async (req, res) => {
    const user = await User.findOne({ where: { resetToken: req.params.token, resetTokenExpiry: { [Op.gt]: Date.now() } } });
    if(!user) return res.render('login', { error: 'Invalid or expired token.' });
    user.password = await bcrypt.hash(req.body.password, 12);
    user.resetToken = null; user.resetTokenExpiry = null;
    await user.save();
    res.render('login', { msg: 'Password updated successfully.' });
});

app.get('/tournaments', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const search = req.query.search || '';
    const sort = req.query.sort === 'deadline' ? [['deadline', 'ASC']] : [['startTime', 'ASC']];
    
    const { count, rows } = await Tournament.findAndCountAll({
        where: { name: { [Op.like]: `%${search}%` } },
        include: [{ model: User, as: 'Organizer' }],
        limit, offset: (page-1)*limit, order: sort
    });
    res.render('index', { 
        tournaments: rows, pages: Math.ceil(count/limit), currentPage: page, search, sort: req.query.sort,
        successMsg: req.query.msg || null
    });
});

app.get('/tournaments/create', (req, res) => {
    if(!req.session.userId) return res.redirect('/auth/login');
    res.render('create');
});
app.post('/tournaments/create', async (req, res) => {
    if(!req.session.userId) return res.redirect('/auth/login');
    if(new Date(req.body.startTime) < new Date()) {
        return res.render('create', { error: "Cannot create a tournament in the past! Please choose a future date." });
    }
    await Tournament.create({ ...req.body, organizerId: req.session.userId });
    res.redirect('/tournaments?msg=Tournament Created Successfully!');
});

app.get('/tournaments/:id', async (req, res) => {
    const tournament = await Tournament.findByPk(req.params.id, { include: [{ model: User, as: 'Organizer' }] });
    if(!tournament) return res.status(404).send('Not Found');
    
    const participantsCount = await Participant.count({ where: { TournamentId: req.params.id } });
    const participants = await Participant.findAll({ where: { TournamentId: req.params.id } });
    const matches = await Match.findAll({ where: { TournamentId: req.params.id }, include: [{ model: User, as: 'Player1' }, { model: User, as: 'Player2' }] });
    
    res.render('tournament', { tournament, participantsCount, matches, participants });
});

app.post('/tournaments/:id/apply', async (req, res) => {
    if(!req.session.userId) return res.redirect('/auth/login');
    const t = await sequelize.transaction();
    try {
        const tournament = await Tournament.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
        if(await Participant.findOne({ where: { TournamentId: tournament.id, UserId: req.session.userId }, transaction: t })) throw new Error('Already registered');
        if(await Participant.count({ where: { TournamentId: tournament.id }, transaction: t }) >= tournament.maxParticipants) throw new Error('Full');
        if(await Participant.findOne({ where: { licenseNumber: req.body.licenseNumber }, transaction: t })) throw new Error('License Taken');
        if(await Participant.findOne({ where: { ranking: req.body.ranking }, transaction: t })) throw new Error('Ranking Taken');
        await Participant.create({ TournamentId: tournament.id, UserId: req.session.userId, ...req.body }, { transaction: t });
        await t.commit();
        res.redirect(`/tournaments/${req.params.id}`);
    } catch(err) { await t.rollback(); res.status(400).send(err.message); }
});

app.post('/tournaments/:id/generate', async (req, res) => {
    if(!req.session.userId) return res.redirect('/auth/login');
    const tournament = await Tournament.findByPk(req.params.id);
    if(tournament.organizerId !== req.session.userId) return res.send('Unauthorized');
    if(new Date(tournament.deadline) > new Date()) return res.send('Deadline not passed');
    const participants = await Participant.findAll({ where: { TournamentId: tournament.id }, order: [['ranking', 'DESC']] });
    if(participants.length < 2) return res.send('Not enough players');
    const matches = [];
    for(let i=0; i<participants.length-1; i+=2) {
        matches.push({ TournamentId: tournament.id, player1Id: participants[i].UserId, player2Id: participants[i+1].UserId });
    }
    await Match.bulkCreate(matches);
    res.redirect(`/tournaments/${tournament.id}`);
});

app.get('/tournaments/:id/edit', async (req, res) => {
    if(!req.session.userId) return res.redirect('/auth/login');
    const tournament = await Tournament.findByPk(req.params.id);
    if(tournament.organizerId !== req.session.userId) return res.send('Unauthorized');
    res.render('edit', { tournament });
});
app.post('/tournaments/:id/edit', async (req, res) => {
    const tournament = await Tournament.findByPk(req.params.id);
    if(tournament.organizerId === req.session.userId) await tournament.update(req.body);
    res.redirect(`/tournaments/${tournament.id}`);
});
app.post('/tournaments/:id/delete', async (req, res) => {
    const tournament = await Tournament.findByPk(req.params.id);
    if(tournament.organizerId === req.session.userId) await tournament.destroy();
    res.redirect('/tournaments');
});

app.post('/matches/report', async (req, res) => {
    if(!req.session.userId) return res.redirect('/auth/login');
    const match = await Match.findByPk(req.body.matchId);
    if(req.session.userId == match.player1Id) match.player1Report = parseInt(req.body.winnerId);
    if(req.session.userId == match.player2Id) match.player2Report = parseInt(req.body.winnerId);
    if(match.player1Report && match.player2Report) {
        if(match.player1Report === match.player2Report) match.winnerId = match.player1Report;
        else { match.player1Report = null; match.player2Report = null; }
    }
    await match.save();
    res.redirect('back');
});

app.get('/users/:id', async (req, res) => {
    try {
        const userProfile = await User.findByPk(req.params.id, {
            include: [{ model: Participant, include: [Tournament] }]
        });
        if(!userProfile) return res.status(404).send("User not found");

        const wonMatches = await Match.findAll({ 
            where: { winnerId: req.params.id },
            attributes: ['TournamentId'] 
        });

        const wonTournamentIds = wonMatches.map(m => m.TournamentId);

        res.render('public-profile', { userProfile, wonTournamentIds });
    } catch(err) { res.status(500).send(err.message); }
});

app.get('/vote', (req, res) => {
    const total = pollVotes.yes + pollVotes.no;
    const yesPercent = total === 0 ? 0 : Math.round((pollVotes.yes / total) * 100);
    const noPercent = total === 0 ? 0 : Math.round((pollVotes.no / total) * 100);
    res.render('vote', { votes: pollVotes, yesPercent, noPercent, voted: false });
});
app.post('/vote', (req, res) => {
    if(req.body.choice === 'yes') pollVotes.yes++; else pollVotes.no++;
    const total = pollVotes.yes + pollVotes.no;
    const yesPercent = total === 0 ? 0 : Math.round((pollVotes.yes / total) * 100);
    const noPercent = total === 0 ? 0 : Math.round((pollVotes.no / total) * 100);
    res.render('vote', { votes: pollVotes, yesPercent, noPercent, voted: true });
});

app.get('/profile', async (req, res) => {
    if(!req.session.userId) return res.redirect('/auth/login');
    const user = await User.findByPk(req.session.userId, { include: [{ model: Participant, include: [Tournament] }, { model: Tournament, as: 'OrganizedTournaments' }] });
    res.render('profile', { user });
});

sequelize.sync().then(() => app.listen(3001, () => console.log('Server running on http://localhost:3001')));