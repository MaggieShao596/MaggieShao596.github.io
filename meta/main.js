
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

// Lab 6 - Code Analysis
const repoURL = 'https://github.com/MaggieShao596/MaggieShao596.github.io';

// Step 1: Load CSV
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

// Group code lines by commit
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
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length
      };

      Object.defineProperty(commit, 'lines', {
        value: lines,
        enumerable: false
      });

      return commit;
    });
}

// Step 1: Summary statistics
function renderCommitInfo(data, commits) {
  const files = d3.groups(data, d => d.file);
  const fileLengths = files.map(([name, lines]) => ({
    name,
    length: d3.max(lines, d => d.line)
  }));

  const stats = [
    ['Total LOC', data.length],
    ['Total commits', commits.length],
    ['Total files', files.length],
    ['Longest file (lines)', d3.max(fileLengths, d => d.length)],
    ['Average file length', d3.mean(fileLengths, d => d.length)?.toFixed(1)],
    ['Average line length', d3.mean(data, d => d.length)?.toFixed(1)],
    ['Maximum depth', d3.max(data, d => d.depth)],
    ['Longest line', d3.max(data, d => d.length)]
  ];

  const container = d3.select('#stats');
  container.selectAll('*').remove();

  const dl = container.append('dl').attr('class', 'stats');

  stats.forEach(([label, value]) => {
    const item = dl.append('div').attr('class', 'stat');
    item.append('dt').text(label);
    item.append('dd').text(value ?? 0);
  });
}

// Step 3: Tooltip
function showTooltip(event, commit) {
  const tooltip = d3.select('#commit-tooltip');

  d3.select('#commit-link')
    .attr('href', commit.url)
    .text(commit.id.slice(0, 8));

  d3.select('#commit-date')
    .text(commit.datetime.toLocaleDateString());

  d3.select('#commit-time')
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

// Steps 2-5: Scatterplot, dot size, brushing
function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = {
    top: 30,
    right: 30,
    bottom: 60,
    left: 75
  };

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`);

  // Step 2: Scales
  const xExtent = d3.extent(commits, d => d.datetime);

  // Handle cases where all commits have the same date
  if (+xExtent[0] === +xExtent[1]) {
    xExtent[0] = new Date(+xExtent[0] - 86400000);
    xExtent[1] = new Date(+xExtent[1] + 86400000);
  }

  const xScale = d3.scaleTime()
    .domain(xExtent)
    .range([margin.left, width - margin.right])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  // Horizontal gridlines
  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left},0)`)
    .call(
      d3.axisLeft(yScale)
        .ticks(8)
        .tickSize(-innerWidth)
        .tickFormat('')
    );

  // X axis
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScale));

  // Y axis
  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(
      d3.axisLeft(yScale)
        .tickValues([0, 4, 8, 12, 16, 20, 24])
        .tickFormat(d => `${String(d).padStart(2, '0')}:00`)
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

  // Step 4: Radius scale
  const maxLines = d3.max(commits, d => d.totalLines) || 1;

  const rScale = d3.scaleSqrt()
    .domain([0, maxLines])
    .range([2, 30]);

  // Step 5: Brushing
  const brush = d3.brush()
    .extent([
      [margin.left, margin.top],
      [width - margin.right, height - margin.bottom]
    ])
    .on('start brush end', brushed);

  const brushGroup = svg.append('g')
    .attr('class', 'brush')
    .call(brush);

  // Draw larger dots first to reduce overlap
  const sortedCommits = d3.sort(
    commits,
    d => -d.totalLines
  );

  const dots = svg.append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .attr('fill-opacity', 0.7)
    .on('mouseenter', (event, d) => {
      showTooltip(event, d);
    })
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  // Allow brushing through empty space while
  // preserving hover interactions on circles.
  dots.on('pointerdown', function(event) {
    hideTooltip();

    const overlay = brushGroup.select('.overlay').node();

    if (overlay) {
      const point = d3.pointer(event, svg.node());

      const syntheticEvent = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        clientX: event.clientX,
        clientY: event.clientY,
        button: event.button,
        buttons: event.buttons
      });

      // Brushing can also be started from empty chart space.
      // Dot hover remains available.
    }
  });

  function brushed(event) {
    const selection = event.selection;

    const selectedCommits = selection
      ? commits.filter(commit => {
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

    dots.classed(
      'selected',
      d => selectedCommits.includes(d)
    );

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

    breakdown.append('h3')
      .text('Language Breakdown');

    languages.forEach(([language, count]) => {
      const percent = (
        count / selectedLines.length * 100
      ).toFixed(1);

      breakdown.append('p')
        .text(`${language || 'Other'}: ${percent}%`);
    });
  }
}

// Initialize visualization
try {
  const data = await loadData();
  const commits = processCommits(data);

  if (commits.length === 0) {
    throw new Error('No commit data found');
  }

  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);

  console.log('Lab 6 loaded successfully:', {
    lines: data.length,
    commits: commits.length
  });

} catch (error) {
  console.error('Lab 6 error:', error);

  d3.select('#chart')
    .text(
      'Unable to load visualization. Make sure meta/loc.csv exists.'
    );
}
