
import { fetchJSON, renderProjects } from "./global.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

/* ========================================
   LAB 5: LOAD REAL PROJECTS ONLY
   ======================================== */

const loadedProjects = await fetchJSON("./lib/projects.json");

// Remove placeholder projects
const projects = Array.isArray(loadedProjects)
  ? loadedProjects.filter((project) => {
      const title = String(project.title ?? "").toLowerCase();
      return !title.includes("placeholder");
    })
  : [];

const projectsContainer = document.querySelector(".projects");
const projectsTitle = document.querySelector(".projects-title");
const searchInput = document.querySelector(".searchBar");

/* ========================================
   FILTER STATE
   ======================================== */

let query = "";
let selectedYear = null;

// Use consistent colors for each year
const colors = d3.scaleOrdinal(d3.schemeTableau10);

/* ========================================
   SEARCH FILTER
   ======================================== */

function matchesSearch(project) {
  const text = Object.values(project)
    .join("\n")
    .toLowerCase();

  return text.includes(query.trim().toLowerCase());
}

/* ========================================
   COMBINED SEARCH + YEAR FILTER
   EXTRA CREDIT
   ======================================== */

function getFilteredProjects() {
  return projects.filter((project) => {
    const searchMatch = matchesSearch(project);

    const yearMatch =
      selectedYear === null ||
      String(project.year ?? "Unknown") === selectedYear;

    return searchMatch && yearMatch;
  });
}

/* ========================================
   LAB 5: RENDER PIE CHART
   ======================================== */

function renderPieChart(projectsGiven) {
  const svg = d3.select("#projects-pie-plot");
  const legend = d3.select(".legend");

  // Clear old chart and legend
  svg.selectAll("*").remove();
  legend.selectAll("*").remove();

  // Group projects by year
  const rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => String(d.year ?? "Unknown")
  );

  const data = rolledData.map(([year, count]) => ({
    label: year,
    value: count
  }));

  // Calculate total projects
  const total = d3.sum(data, (d) => d.value);

  // Create pie generator
  const sliceGenerator = d3.pie()
    .value((d) => d.value)
    .sort(null);

  // Create arc generator
  const arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  const arcData = sliceGenerator(data);

  /* ========================================
     DRAW SLICES AND PERCENTAGES
     ======================================== */

  arcData.forEach((slice) => {
    const year = slice.data.label;
    const isSelected = selectedYear === year;

    const percentage = total > 0
      ? (slice.data.value / total) * 100
      : 0;

    // Draw pie slice
    svg.append("path")
      .attr("d", arcGenerator(slice))
      .attr("fill", colors(year))
      .classed("selected", isSelected)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr(
        "aria-label",
        `${year}: ${percentage.toFixed(1)}%`
      )
      .on("click", () => toggleYear(year))
      .on("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleYear(year);
        }
      });

    // Percentage label inside pie slice
    const [x, y] = arcGenerator.centroid(slice);

    svg.append("text")
      .attr("class", "percentage-label")
      .attr("x", x)
      .attr("y", y)
      .text(`${percentage.toFixed(1)}%`);
  });

  /* ========================================
     DRAW LEGEND
     ======================================== */

  data.forEach((item) => {
    const year = item.label;

    const percentage = total > 0
      ? (item.value / total) * 100
      : 0;

    legend.append("li")
      .attr("style", `--color: ${colors(year)}`)
      .classed("selected", selectedYear === year)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr(
        "aria-label",
        `Filter projects from ${year}`
      )
      .html(
        `<span class="swatch"></span>
         ${year}
         <em>(${item.value}, ${percentage.toFixed(1)}%)</em>`
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

/* ========================================
   LAB 5: YEAR FILTER
   ======================================== */

function toggleYear(year) {
  // Click the same year again to deselect
  selectedYear = selectedYear === year ? null : year;

  updateProjects();
}

/* ========================================
   UPDATE PROJECTS AND CHART
   ======================================== */

function updateProjects() {
  // Apply both filters
  const filteredProjects = getFilteredProjects();

  // Render project cards
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

  // Chart responds to search,
  // while year selection highlights its slice
  const searchResults = projects.filter(matchesSearch);

  renderPieChart(searchResults);
}

/* ========================================
   LAB 5: SEARCH BAR
   ======================================== */

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    query = event.target.value;

    // Find available years after searching
    const availableYears = projects
      .filter(matchesSearch)
      .map((project) =>
        String(project.year ?? "Unknown")
      );

    // Clear selected year if no longer available
    if (
      selectedYear !== null &&
      !availableYears.includes(selectedYear)
    ) {
      selectedYear = null;
    }

    updateProjects();
  });
}

/* ========================================
   INITIAL RENDER
   ======================================== */

updateProjects();

