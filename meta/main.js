
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3/+esm';

const repoURL =
  'https://github.com/MaggieShao596/MaggieShao596.github.io';

const width = 1000;
const height = 600;
const margin = {
  top: 30,
  right: 30,
  bottom: 60,
  left: 75
};

const colors = d3.scaleOrdinal(d3.schemeTableau10);

let data = [];
let commits = [];
let filteredCommits = [];
let commitProgress = 100;
let commitMaxTime;
let timeScale;
let xScale;
let yScale;
let rScale;
let svg;
let brush;
let brushGroup;
let dotsGroup;
let scroller;

async function loadData() {
  return d3.csv('loc.csv', row => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(`${row.date}T00:00${row.timezone}`),
    datetime: new Date(row.datetime)
  }));
}

function processCommits(data) {
  return d3.groups(data, d => d.commit)
    .map(([id, lines]) => {
      const first = lines[0];
      const datetime = first.datetime;

      const commit = {
        id,
        url: `${repoURL}/commit/${id}`,
        author: first.author,
        date: first.date,
        time: first.time,
        timezone: first.timezone,
        datetime,
        hourFrac:
          datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length
      };

      Object.defineProperty(commit, 'lines', {
        value: lines,
        enumerable: false
      });

      return commit;
    })
    .sort((a, b) => a.datetime - b.datetime);
}

// Summary statistics
function renderCommitInfo(lines, visibleCommits) {
  const files = d3.groups(lines, d => d.file);

  const fileLengths = files.map(([name, fileLines]) => ({
    name,
    length: d3.max(fileLines, d => d.line) || 0
  }));

  const stats = [
    ['Total LOC', lines.length],
    ['Total commits', visibleCommits.length],
    ['Total files', files.length],
    ['Longest file (lines)',
      d3.max(fileLengths, d => d.length) || 0],
    ['Average file length',
      d3.mean(fileLengths, d => d.length)?.toFixed(1) || 0],
    ['Average line length',
      d3.mean(lines, d => d.length)?.toFixed(1) || 0],
    ['Maximum depth',
      d3.max(lines, d => d.depth) || 0],
    ['Longest line',
      d3.max(lines, d => d.length) || 0]
  ];

  const container = d3.select('#stats');
  container.selectAll('*').remove();

  const dl = container.append('dl').attr('class', 'stats');

  stats.forEach(([label, value]) => {
    const item = dl.append('div').attr('class', 'stat');
    item.append('dt').text(label);
    item.append('dd').text(value);
  });
}

// Tooltip
function showTooltip(event, commit) {
  const tooltip = d3.select('#commit-tooltip');

  d3.select('#commit-link')
    .attr('href', commit.url)
    .text(commit.id.slice(0, 8));

  d3.select('#commit-date')
    .text(commit.datetime.toLocaleDateString());

  d3.select('#commit-time-tooltip')
    .text(commit.time);

  d3.select('#commit-author')
    .text(commit.author);

  d3.select('#commit-lines')
    .text(commit.totalLines);

  tooltip.property('hidden', false);
  moveTooltip(event);
}

function moveTooltip(event) {
  const tooltip = document.getElementById('commit-tooltip');
  if (tooltip.hidden) return;

  const rect = tooltip.getBoundingClientRect();

  const left = Math.min(
    event.clientX + 15,
    window.innerWidth - rect.width - 10
  );

  const top = Math.min(
    event.clientY + 15,
    window.innerHeight - rect.height - 10
  );

  tooltip.style.left = `${Math.max(5, left)}px`;
  tooltip.style.top = `${Math.max(5, top)}px`;
}

function hideTooltip() {
  d3.select('#commit-tooltip').property('hidden', true);
}

// Initial scatterplot
function renderScatterPlot() {
  svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`);

  const extent = d3.extent(commits, d => d.datetime);

  if (+extent[0] === +extent[1]) {
    extent[0] = new Date(+extent[0] - 86400000);
    extent[1] = new Date(+extent[1] + 86400000);
  }

  xScale = d3.scaleTime()
    .domain(extent)
    .range([margin.left, width - margin.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  rScale = d3.scaleSqrt()
    .domain([0, d3.max(commits, d => d.totalLines) || 1])
    .range([2, 30]);

  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left},0)`)
    .call(
      d3.axisLeft(yScale)
        .ticks(8)
        .tickSize(-(width - margin.left - margin.right))
        .tickFormat('')
    );

  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform',
      `translate(0,${height - margin.bottom})`);

  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${margin.left},0)`)
    .call(
      d3.axisLeft(yScale)
        .tickValues([0, 4, 8, 12, 16, 20, 24])
        .tickFormat(d =>
          `${String(d).padStart(2, '0')}:00`
        )
    );

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height - 10)
    .attr('text-anchor', 'middle')
    .attr('fill', 'currentColor')
    .text('Commit Date');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', 18)
    .attr('text-anchor', 'middle')
    .attr('fill', 'currentColor')
    .text('Time of Day');

  // Dots stay in the same group during updates
  dotsGroup = svg.append('g').attr('class', 'dots');

  // Brushing is layered over the plot
  brush = d3.brush()
    .extent([
      [margin.left, margin.top],
      [width - margin.right, height - margin.bottom]
    ])
    .on('start brush end', brushed);

  brushGroup = svg.append('g')
    .attr('class', 'brush')
    .call(brush);

  // Keep dots above the brush overlay for hover
  dotsGroup.raise();

  updateScatterPlot(filteredCommits);
}

function updateScatterPlot(visibleCommits) {
  if (!svg) return;

  hideTooltip();

  const extent = d3.extent(visibleCommits, d => d.datetime);

  if (extent[0] && extent[1]) {
    const start = new Date(+extent[0]);
    const end = new Date(+extent[1]);

    if (+start === +end) {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() + 1);
    }

    xScale.domain([start, end]).nice();
  } else {
    const allExtent = d3.extent(commits, d => d.datetime);
    xScale.domain(allExtent).nice();
  }

  svg.select('.x-axis')
    .transition()
    .duration(250)
    .call(d3.axisBottom(xScale));

  const sortedCommits = d3.sort(
    visibleCommits,
    d => -d.totalLines
  );

  dotsGroup.selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join(
      enter => enter.append('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', 0)
        .attr('fill', 'steelblue')
        .attr('fill-opacity', 0.7)
        .call(enter =>
          enter.transition()
            .duration(300)
            .attr('r', d => rScale(d.totalLines))
        ),
      update => update.call(update =>
        update.transition()
          .duration(300)
          .attr('cx', d => xScale(d.datetime))
          .attr('cy', d => yScale(d.hourFrac))
          .attr('r', d => rScale(d.totalLines))
      ),
      exit => exit.transition()
        .duration(200)
        .attr('r', 0)
        .remove()
    )
    .on('mouseenter', showTooltip)
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  // Clear previous brush selection when time changes
  brushGroup.call(brush.move, null);
}

function brushed(event) {
  const selection = event.selection;

  const selectedCommits = selection
    ? filteredCommits.filter(commit => {
        const x = xScale(commit.datetime);
        const y = yScale(commit.hourFrac);

        return (
          x >= selection[0][0] &&
          x <= selection[1][0] &&
          y >= selection[0][1] &&
          y <= selection[1][1]
        );
      })
    : [];

  dotsGroup.selectAll('circle')
    .classed('selected',
      d => selectedCommits.includes(d));

  d3.select('#selection-count')
    .text(
      selection
        ? `${selectedCommits.length} commits selected`
        : 'No commits selected'
    );

  const selectedLines = selectedCommits.flatMap(
    commit => commit.lines
  );

  const breakdown = d3.select('#language-breakdown');
  breakdown.selectAll('*').remove();

  if (!selectedLines.length) return;

  const languages = d3.rollups(
    selectedLines,
    lines => lines.length,
    d => d.type
  ).sort((a, b) => b[1] - a[1]);

  breakdown.append('h3').text('Language Breakdown');

  languages.forEach(([language, count]) => {
    const percent =
      (count / selectedLines.length * 100).toFixed(1);

    breakdown.append('p')
      .text(`${language || 'Other'}: ${percent}%`);
  });
}

// File unit visualization
function updateFileDisplay(visibleCommits) {
  const lines = visibleCommits.flatMap(d => d.lines);

  const files = d3.groups(lines, d => d.file)
    .map(([name, fileLines]) => ({
      name,
      lines: fileLines
    }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const container = d3.select('#files');

  const fileRows = container.selectAll('.file-row')
    .data(files, d => d.name)
    .join(
      enter => {
        const row = enter.append('div')
          .attr('class', 'file-row');

        const dt = row.append('dt');
        dt.append('code');
        dt.append('small');

        row.append('dd');
        return row;
      },
      update => update,
      exit => exit.remove()
    );

  fileRows.order();

  fileRows.select('dt code')
    .text(d => d.name);

  fileRows.select('dt small')
    .text(d => `${d.lines.length} lines`);

  fileRows.select('dd')
    .selectAll('.loc')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .style('--color', d => colors(d.type || 'Other'))
    .attr('title', d =>
      `${d.type || 'Other'} — ${d.file}, line ${d.line}`
    );

  // Technology color legend
  const technologies = [...new Set(
    lines.map(d => d.type || 'Other')
  )].sort();

  const legend = d3.select('#file-legend')
    .selectAll('.legend-item')
    .data(technologies, d => d)
    .join('span')
    .attr('class', 'legend-item');

  legend.selectAll('*').remove();

  legend.append('span')
    .attr('class', 'legend-swatch')
    .style('background', d => colors(d));

  legend.append('span')
    .text(d => d);
}

// Shared update function for slider and scrolling
function updateTime(progress) {
  commitProgress = Math.max(0, Math.min(100, progress));
  commitMaxTime = timeScale.invert(commitProgress);

  d3.select('#commit-progress')
    .property('value', commitProgress);

  d3.select('#commit-time')
    .text(
      commitMaxTime.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    );

  filteredCommits = commits.filter(
    d => d.datetime <= commitMaxTime
  );

  const visibleLines = filteredCommits.flatMap(
    d => d.lines
  );

  renderCommitInfo(visibleLines, filteredCommits);
  updateScatterPlot(filteredCommits);
  updateFileDisplay(filteredCommits);
}

// Create scroll narrative
function renderStory() {
  const story = d3.select('#scatter-story');

  const steps = story.selectAll('.step')
    .data(commits, d => d.id)
    .join('div')
    .attr('class', 'step');

  steps.selectAll('*').remove();

  steps.append('h3')
    .text((d, i) =>
      i === 0 ? 'The Beginning' : `Commit ${i + 1}`
    );

  steps.append('p')
    .text(d =>
      `On ${d.datetime.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })}, I made a commit to my website.`
    );

  steps.append('p')
    .text(d => {
      const fileCount = new Set(
        d.lines.map(line => line.file)
      ).size;

      return `This commit includes ${d.totalLines} lines
        across ${fileCount} files.`;
    });

  steps.append('a')
    .attr('href', d => d.url)
    .attr('target', '_blank')
    .attr('rel', 'noopener noreferrer')
    .text('View commit on GitHub');

  scroller = scrollama();

  scroller.setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
    offset: 0.5
  }).onStepEnter(response => {
    const index = response.index;
    const commit = commits[index];

    if (!commit) return;

    const progress = timeScale(commit.datetime);
    updateTime(progress);

    d3.selectAll('#scatter-story .step')
      .classed('active', (d, i) => i === index);
  });

  window.addEventListener('resize', () => {
    scroller.resize();
  });
}

// Initialize everything
try {
  data = await loadData();
  commits = processCommits(data);

  if (!commits.length) {
    throw new Error('No commit data found');
  }

  const extent = d3.extent(commits, d => d.datetime);

  // Ensure the time scale has a valid range
  if (+extent[0] === +extent[1]) {
    extent[0] = new Date(+extent[0] - 86400000);
    extent[1] = new Date(+extent[1] + 86400000);
  }

  timeScale = d3.scaleTime()
    .domain(extent)
    .range([0, 100]);

  filteredCommits = commits;

  renderScatterPlot();
  renderStory();

  d3.select('#commit-progress')
    .on('input', function() {
      updateTime(Number(this.value));
    });

  updateTime(100);

  console.log('Lab 8 loaded successfully:', {
    lines: data.length,
    commits: commits.length
  });

} catch (error) {
  console.error('Lab 8 error:', error);

  d3.select('#chart')
    .text(
      'Unable to load visualization. ' +
      'Make sure meta/loc.csv exists and check the console.'
    );
}
