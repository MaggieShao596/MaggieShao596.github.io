
import { fetchJSON, renderProjects } from "./global.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// ========================================
// Lab 5: Load project data
// ========================================

const projects = (await fetchJSON("./lib/projects.json")) ?? [];

const projectsContainer = document.querySelector(".projects");
const projectsTitle = document.querySelector(".projects-title");

// Store search and year filters
let query = "";
let selectedYear = null;

// Keep year colors consistent
const colors = d3.scaleOrdinal(d3.schemeTableau10);

// ========================================
// Search filtering
// ========================================

function matchesSearch(project) {
  const text = Object.values(project)
    .join("\n")
    .toLowerCase();

  return text.includes(query.toLowerCase());
}

function getFilteredProjects() {
  return projects.filter((project) => {
    const searchMatch = matchesSearch(project);

    const yearMatch =
      selectedYear === null ||
      String(project.year) === selectedYear;

    return searchMatch && yearMatch;
  });
}

// ========================================
// Lab 5: Draw pie chart
// ========================================

function renderPieChart(projectsGiven) {
  const svg = d3.select("#projects-pie-plot");
  const legend = d3.select(".legend");

  // Clear old chart and legend
  svg.selectAll("*").remove();
  legend.selectAll("*").remove();

  // Count projects per year
  const rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => String(d.year ?? "Unknown")
  );

  const data = rolledData.map(([year, count]) => ({
    label: year,
    value: count
  }));

  // Generate pie slices
  const sliceGenerator = d3.pie()
    .value((d) => d.value)
    .sort(null);

  const arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  const arcData = sliceGenerator(data);

  // Draw slices
  arcData.forEach((slice) => {
    const year = slice.data.label;
    const isSelected = selectedYear === year;

    svg.append("path")
      .attr("d", arcGenerator(slice))
      .attr("fill", colors(year))
      .classed("selected", isSelected)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", `Filter projects from ${year}`)
      .on("click", () => toggleYear(year))
      .on("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleYear(year);
        }
      });
  });

  // Draw legend
  data.forEach((item) => {
    const year = item.label;

    legend.append("li")
      .attr("style", `--color: ${colors(year)}`)
      .classed("selected", selectedYear === year)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", `Filter projects from ${year}`)
      .html(
        `<span class="swatch"></span>
         ${year} <em>(${item.value})</em>`
      )
      .on("click", () => toggleYear(year))
      .on("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleYear(year);
        }
      });
  });
}

// ========================================
// Lab 5: Click year to filter
// ========================================

function toggleYear(year) {
  selectedYear = selectedYear === year ? null : year;
  updateProjects();
}

// ========================================
// Lab 5: Update projects and chart
// ========================================

function updateProjects() {
  const filteredProjects = getFilteredProjects();

  // Update visible project cards
  renderProjects(
    filteredProjects,
    projectsContainer,
    "h2"
  );

  // Update project count
  if (projectsTitle) {
    projectsTitle.textContent =
      `Projects (${filteredProjects.length})`;
  }

  // Pie chart uses search-filtered projects.
  // Year selection only highlights the slice.
  // This keeps other years clickable.
  const searchResults = projects.filter(matchesSearch);

  renderPieChart(searchResults);
}

// ========================================
// Lab 5: Search bar
// ========================================

const searchInput = document.querySelector(".searchBar");

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    query = event.target.value;

    // Clear selected year if no search results
    // contain that year.
    const availableYears = projects
      .filter(matchesSearch)
      .map((project) => String(project.year ?? "Unknown"));

    if (
      selectedYear !== null &&
      !availableYears.includes(selectedYear)
    ) {
      selectedYear = null;
    }

    updateProjects();
  });
}

// Initial rendering
updateProjects();
