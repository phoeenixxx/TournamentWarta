const router = require('express').Router();
const { Tournament, Participant, sequelize } = require('../models');
const { Op } = require('sequelize');

router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const { count, rows } = await Tournament.findAndCountAll({
        where: { name: { [Op.iLike]: `%${search}%` } },
        limit: 10,
        offset: (page - 1) * 10
    });
    res.render('index', { tournaments: rows, pages: Math.ceil(count / 10), search });
});

router.post('/:id/apply', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const tournament = await Tournament.findByPk(req.params.id, { lock: t.LOCK.UPDATE, transaction: t });
        const count = await Participant.count({ where: { TournamentId: tournament.id }, transaction: t });

        if (count >= tournament.maxParticipants) throw new Error('Tournament is full');

        await Participant.create({
            TournamentId: tournament.id,
            UserId: req.session.userId,
            licenseNumber: req.body.license,
            ranking: req.body.ranking
        }, { transaction: t });

        await t.commit();
        res.redirect(`/tournaments/${req.params.id}`);
    } catch (err) {
        await t.rollback();
        res.status(400).send(err.message);
    }
});

module.exports = router;