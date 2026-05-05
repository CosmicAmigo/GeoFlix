async function fetchLeaderboard(pointType = 'both', timePeriod = '1week') {
    try {
        const response = await fetch(`/api/leaderboard?pointType=${pointType}&timePeriod=${timePeriod}`);
        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}

async function populateLeaderboard(pointType = 'both', timePeriod = '1week') {
    const leaderboardBody = document.getElementById('leaderboard-body');
    leaderboardBody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>'; // Show loading

    const data = await fetchLeaderboard(pointType, timePeriod);

    leaderboardBody.innerHTML = ''; // Clear loading

    data.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.username}</td>
            <td>${entry.score}</td>
            <td>${entry.account_age}</td>
        `;
        leaderboardBody.appendChild(row);
    });
}

// Load default leaderboard on page load
document.addEventListener('DOMContentLoaded', () => {
    populateLeaderboard();

    // Add event listener to update button
    document.getElementById('updateBtn').addEventListener('click', () => {
        const pointType = document.getElementById('pointType').value;
        const timePeriod = document.getElementById('timePeriod').value;
        populateLeaderboard(pointType, timePeriod);
    });
});