router.post('/report', async (req, res) => {
    const { matchId, reportedWinnerId } = req.body;
    const userId = req.session.userId;
    const match = await Match.findByPk(matchId);

    if (userId === match.player1Id) match.player1Report = reportedWinnerId;
    if (userId === match.player2Id) match.player2Report = reportedWinnerId;

    await match.save();

    if (match.player1Report && match.player2Report) {
        if (match.player1Report === match.player2Report) {
            match.winnerId = match.player1Report; 
        } else {
            match.player1Report = null;
            match.player2Report = null;
        }
        await match.save();
    }
    res.redirect('back');
});