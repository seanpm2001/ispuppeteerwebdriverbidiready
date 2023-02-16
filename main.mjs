const pf = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'percent',
  maximumFractionDigits: 2,
});

function formatPercentage(number) {
  return pf.format(number * 100);
}

function buildTooltip(label, counts) {
  return `
    <div style="padding: 10px; font-size: 18px;">
      <h3 style="margin: 0;">${label}</h3>
      <div>Total: ${counts.total}</div>
      <div>Passing: ${counts.passing} (${formatPercentage(counts.passing / counts.total)})</div>
      <div>Skipping: ${counts.skipping}</div>
      <div>Failing: ${counts.failing}</div>
    </div>
  `;
}

async function main() {
  const response = await fetch('./data.json');
  const entries = await response.json();
  const chartData = [];
  let prev = [];
  for (const entry of entries.reverse()) {
    const { date, firefoxCounts, chromeCounts } = entry;
    if (prev[0] === chromeCounts.passing && prev[1] === firefoxCounts.passing) {
      continue;
    }
    prev = [chromeCounts.passing, firefoxCounts.passing];
    chartData.push(
      [new Date(date), firefoxCounts.passing / firefoxCounts.total * 100, chromeCounts.passing / chromeCounts.total * 100, buildTooltip('Firefox', firefoxCounts), buildTooltip('Chrome', chromeCounts)]
    );
    if (chartData.length > 7) {
      break;
    }
  }

  chartData.reverse();

  const ctx = document.getElementById('chart');

  const getOrCreateTooltip = (chart) => {
    let tooltipEl = chart.canvas.parentNode.querySelector('div');
  
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.style.background = 'rgba(0, 0, 0, 0.7)';
      tooltipEl.style.borderRadius = '3px';
      tooltipEl.style.color = 'white';
      tooltipEl.style.opacity = 1;
      tooltipEl.style.pointerEvents = 'none';
      tooltipEl.style.position = 'absolute';
      tooltipEl.style.transform = 'translate(-50%, 0)';
      tooltipEl.style.transition = 'all .1s ease';
  
      const table = document.createElement('table');
      table.style.margin = '0px';
  
      tooltipEl.appendChild(table);
      chart.canvas.parentNode.appendChild(tooltipEl);
    }
  
    return tooltipEl;
  };
  
  const externalTooltipHandler = (context) => {
    // Tooltip Element
    const {chart, tooltip} = context;
    const tooltipEl = getOrCreateTooltip(chart);
  
    // Hide if no tooltip
    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = 0;
      return;
    }
  
    // Set Text
    if (tooltip.body) {
      const dataPoints = tooltip.dataPoints;
      const dataPoint = dataPoints[0];
      const dataIndex = dataPoint.dataIndex;
      const datasetIndex = dataPoint.datasetIndex;
      tooltipEl.innerHTML = chartData[dataIndex][3 + datasetIndex];
    }
  
    const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;
  
    // Display, position, and set styles for font
    tooltipEl.style.opacity = 1;
    tooltipEl.style.left = positionX + tooltip.caretX + 'px';
    tooltipEl.style.top = Math.max(positionY + tooltip.caretY - 200 , 0) + 'px';
    tooltipEl.style.font = tooltip.options.bodyFont.string;
    tooltipEl.style.padding = tooltip.options.padding + 'px ' + tooltip.options.padding + 'px';
  };

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.map(item => item[0].toLocaleDateString('en-US')),
      datasets: [{
        label: '% tests passed (Firefox)',
        data: chartData.map(item => item[1]),
        borderWidth: 1
      }, {
        label: '% tests passed (Chrome)',
        data: chartData.map(item => item[2]),
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        tooltip: {
          enabled: false,
          external: externalTooltipHandler
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          ticks: {
            callback: function(value, index, ticks) {
                return value + '%';
            }
          }
        }
      }
    }
  });

  const elTime = document.querySelector('time');
  const date = new Date().toISOString().slice(0, 'YYYY-MM-DD'.length);
  elTime.textContent = date;
}

main();
