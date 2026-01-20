const bcrypt = require('bcryptjs');
const { sequelize, User, Tournament, Participant, Match } = require('./models');

const realDisciplines = ['Tennis', 'Chess', 'Basketball', 'Football', 'Judo', 'Volleyball', 'Esports', 'Rugby', 'Boxing', 'Fencing'];
const realTournaments = [
    { name: "Wimbledon Open", location: "London, UK" },
    { name: "Roland Garros", location: "Paris, France" },
    { name: "US Open", location: "New York, USA" },
    { name: "Australian Open", location: "Melbourne, Australia" },
    { name: "Tbilisi Grand Slam", location: "Tbilisi, Georgia" },
    { name: "Berlin Masters", location: "Berlin, Germany" },
    { name: "Tokyo Olympic Arena", location: "Tokyo, Japan" },
    { name: "Madrid Clay Court", location: "Madrid, Spain" },
    { name: "Rome Gladiator Cup", location: "Rome, Italy" },
    { name: "Rio Beach Games", location: "Rio, Brazil" },
    { name: "Dubai Desert Classic", location: "Dubai, UAE" },
    { name: "Monaco Elite", location: "Monte Carlo, Monaco" },
    { name: "Poznan Open", location: "Poznan, Poland" },
    { name: "Warsaw Championship", location: "Warsaw, Poland" }
];

const firstNames = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Giorgi", "Levan", "Nika", "Luka", "Sandro", "Nino", "Mariam", "Ana", "Salome", "Tamar", "Oliver", "Jack", "Harry", "Jacob", "Charlie", "Thomas", "George", "Oscar", "James", "William"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Beridze", "Kapanadze", "Gelashvili", "Maisuradze", "Lomidze", "Tsiklauri", "Shengelia", "Abashidze", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson"];

function generateName() {
    return {
        first: firstNames[Math.floor(Math.random() * firstNames.length)],
        last: lastNames[Math.floor(Math.random() * lastNames.length)]
    };
}

async function seedDatabase() {
    try {
        await sequelize.sync({ force: true });
        const password = await bcrypt.hash('123456', 12);
        
        const organizers = await User.bulkCreate([
            { firstName: 'Alice', lastName: 'Director', email: 'alice@warta.com', password, isActive: true },
            { firstName: 'Bob', lastName: 'Manager', email: 'bob@warta.com', password, isActive: true }
        ]);

        const usersData = [];
        for(let i=0; i<150; i++) {
            const name = generateName();
            usersData.push({ firstName: name.first, lastName: name.last, email: `user${i}@test.com`, password, isActive: true });
        }
        const users = await User.bulkCreate(usersData);

        let globalRanking = 1000; 

        for (let i = 0; i < 80; i++) {
            const template = realTournaments[i % realTournaments.length];
            const discipline = realDisciplines[i % realDisciplines.length];
            const isPast = i % 2 === 0;
            const startDate = new Date();
            if (isPast) startDate.setDate(startDate.getDate() - (Math.random() * 30 + 5));
            else startDate.setDate(startDate.getDate() + (Math.random() * 30 + 5));
            
            const deadline = new Date(startDate);
            deadline.setDate(deadline.getDate() - 2);

            const t = await Tournament.create({
                name: `${template.name} ${isPast ? '2024' : '2026'} - ${i}`,
                discipline: discipline,
                startTime: startDate,
                deadline: deadline,
                location: template.location,
                maxParticipants: 16,
                organizerId: organizers[i % 2].id,
                sponsors: JSON.stringify(["https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg"])
            });

            if (isPast) {
                const shuffledUsers = [...users].sort(() => 0.5 - Math.random()).slice(0, 16);
                const participants = [];
                
                for (let j = 0; j < shuffledUsers.length; j++) {
                    participants.push({
                        TournamentId: t.id, 
                        UserId: shuffledUsers[j].id,
                        licenseNumber: `LIC-${t.id}-${shuffledUsers[j].id}`, 
                        ranking: globalRanking++ 
                    });
                }
                
                await Participant.bulkCreate(participants);
                const sortedParts = participants.sort((a,b) => b.ranking - a.ranking);
                const matches = [];
                for(let k=0; k<sortedParts.length-1; k+=2) {
                    const p1 = sortedParts[k].UserId;
                    const p2 = sortedParts[k+1].UserId;
                    const winner = Math.random() > 0.5 ? p1 : p2;
                    matches.push({
                        TournamentId: t.id, player1Id: p1, player2Id: p2, round: 1,
                        winnerId: winner, player1Report: winner, player2Report: winner
                    });
                }
                await Match.bulkCreate(matches);
            }
        }
        console.log('Database Seeded Successfully!');
    } catch (err) { console.error(err); } finally { await sequelize.close(); }
}

seedDatabase();