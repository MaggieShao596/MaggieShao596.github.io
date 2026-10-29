
import { fetchJSON, renderProjects } from "./global.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

/* ========================================
   LAB 5: LOAD PROJECT DATA
   ======================================== */

const loadedProjects = await fetchJSON("./lib/projects.json");
const projects = Array.isArray(loadedProjects) ? loadedProjects : [];

const projectsContainer = document.querySelector(".projects");
const projectsTitle = document.querySelector(".projects-title");
const searchInput = document.querySelector(".searchBar");

/* ========================================
   FILTER STATE
   ======================================== */

let query = "";
let selectedYear = null;

// Consistent colors for each year
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
   COMBINED FILTER
   Search + Year (Extra Credit)
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
   LAB 5: DRAW PIE CHART
   ======================================== */

function renderPieChart(projectsGiven) {
  const svg = d3.select("#projects-pie-plot");
  const legend = d3.select(".legend");

  // Clear previous chart and legend
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

  // Total number of projects in the current search
  const total = d3.sum(data, (d) => d.value);

  // Pie generator
  const sliceGenerator = d3.pie()
    .value((d) => d.value)
    .sort(null);

  // Arc generator
  const arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  const arcData = sliceGenerator(data);

  /* ========================================
     DRAW PIE SLICES + PERCENTAGES
     ======================================== */

  arcData.forEach((slice) => {
    const year = slice.data.label;
    const isSelected = selectedYear === year;

    const percentage =
      total > 0
        ? (slice.data.value / total) * 100
        : 0;

    // Draw slice
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
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          toggleYear(year);
        }
      });

    // Add percentage inside each slice
    const [x, y] = arcGenerator.centroid(slice);

    svg.append("text")
      .attr("class", "percentage-label")
      .attr("x", x)
      .attr("y", y)
      .text(`${percentage.toFixed(1)}%`);
  });

  /* ========================================
     DRAW LEGEND + PERCENTAGES
     ======================================== */

  data.forEach((item) => {
    const year = item.label;

    const percentage =
      total > 0
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
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          toggleYear(year);
        }
      });
  });
}

/* ========================================
   LAB 5: CLICK YEAR TO FILTER
   ======================================== */

function toggleYear(year) {
  // Click the same year again to deselect
  selectedYear =
    selectedYear === year ? null : year;

  updateProjects();
}

/* ========================================
   LAB 5: UPDATE PROJECTS + CHART
   ======================================== */

function updateProjects() {
  // Apply search and year filters together
  const filteredProjects = getFilteredProjects();

  // Render project cards
  renderProjects(
    filteredProjects,
    projectsContainer,
    "h2"
  );

  // Update visible project count
  if (projectsTitle) {
    projectsTitle.textContent =
      `Projects (${filteredProjects.length})`;
  }

  // Chart reflects search results,
  // while the selected year remains highlighted.
  // This keeps all matching year slices clickable.
  const searchResults = projects.filter(matchesSearch);

  renderPieChart(searchResults);
}

/* ========================================
   LAB 5: SEARCH BAR
   ======================================== */

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    query = event.target.value;

    // Check years available after searching
    const availableYears = projects
      .filter(matchesSearch)
      .map((project) =>
        String(project.year ?? "Unknown")
      );

    // Clear selected year only if it no longer
    // exists in the search results
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
