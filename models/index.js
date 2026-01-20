const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'database.sqlite'),
    logging: false
});

const User = sequelize.define('User', {
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: false },
    confirmationToken: { type: DataTypes.STRING },
    confirmationTokenExpiry: { type: DataTypes.DATE },
    resetToken: { type: DataTypes.STRING },
    resetTokenExpiry: { type: DataTypes.DATE }
});

const Tournament = sequelize.define('Tournament', {
    name: { type: DataTypes.STRING, allowNull: false },
    discipline: { type: DataTypes.STRING, allowNull: false },
    startTime: { type: DataTypes.DATE, allowNull: false },
    deadline: { type: DataTypes.DATE, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: false },
    maxParticipants: { type: DataTypes.INTEGER, allowNull: false },
    sponsors: { type: DataTypes.TEXT, defaultValue: '[]' },
    organizerId: { type: DataTypes.INTEGER, allowNull: false }
});

const Participant = sequelize.define('Participant', {
    licenseNumber: { type: DataTypes.STRING, unique: true },
    ranking: { type: DataTypes.INTEGER, unique: true },
    status: { type: DataTypes.STRING, defaultValue: 'pending' }
});

const Match = sequelize.define('Match', {
    round: { type: DataTypes.INTEGER, defaultValue: 1 },
    player1Id: { type: DataTypes.INTEGER },
    player2Id: { type: DataTypes.INTEGER },
    player1Report: { type: DataTypes.INTEGER },
    player2Report: { type: DataTypes.INTEGER },
    winnerId: { type: DataTypes.INTEGER }
});

User.hasMany(Tournament, { foreignKey: 'organizerId', as: 'OrganizedTournaments' });
Tournament.belongsTo(User, { foreignKey: 'organizerId', as: 'Organizer' });
Tournament.hasMany(Participant);
Participant.belongsTo(Tournament);
User.hasMany(Participant);
Participant.belongsTo(User);
Tournament.hasMany(Match);
Match.belongsTo(Tournament);
Match.belongsTo(User, { as: 'Player1', foreignKey: 'player1Id' });
Match.belongsTo(User, { as: 'Player2', foreignKey: 'player2Id' });
Match.belongsTo(User, { as: 'Winner', foreignKey: 'winnerId' });

module.exports = { sequelize, User, Tournament, Participant, Match };