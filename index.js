
import {
  fetchJSON,
  renderProjects,
  fetchGitHubData
} from "./global.js";

// ===== LAB 4 STEP 2: LATEST PROJECTS =====

// Load project data from JSON
const projects = await fetchJSON("./lib/projects.json");

// Find the projects container on the homepage
const projectsContainer = document.querySelector(".projects");

// Display the first 3 projects
if (projectsContainer && Array.isArray(projects)) {
  const latestProjects = projects.slice(0, 3);

  renderProjects(latestProjects, projectsContainer, "h3");
}

// ===== LAB 4 STEP 3: GITHUB API =====

// Find the GitHub stats container
const profileStats = document.querySelector("#profile-stats");

if (profileStats) {
  // Fetch your GitHub profile data
  const githubData = await fetchGitHubData("MaggieShao596");

  if (githubData) {
    profileStats.innerHTML = `
      <dl>
        <dt>Public Repos</dt>
        <dd>${githubData.public_repos}</dd>

        <dt>Public Gists</dt>
        <dd>${githubData.public_gists}</dd>

        <dt>Followers</dt>
        <dd>${githubData.followers}</dd>

        <dt>Following</dt>
        <dd>${githubData.following}</dd>
      </dl>
    `;
  } else {
    profileStats.textContent = "GitHub stats are unavailable.";
  }
}
