import teams from './teams';
import config from './config';
// TODO: extract from retrieved lists at runtime
// const T1 = 1610612739;
// const T2 = 1610612744;
const settings = {
  ghosts: true,
  speed: 1,
};
// TODO: manage these groups directly within D3
let pGhosts = [];
let bGhosts = [];
let ballPositions;
let playerPositions;
let handle;
let frame = 0;
let t1;
let selectedPid = 0;

function reset() {
  frame = 0;
  pGhosts = [];
  bGhosts = [];
  const svg = d3.select('svg');
  svg.selectAll('.player-ghosts').remove();
  svg.selectAll('.ball-ghosts').remove();
}

function toggle() {
  if (handle > 0) {
    clearInterval(handle);
    handle = 0;
  } else {
    handle = setInterval(tick, config.interval / (settings.speed));
  }
}

function tick() {
  const svg = d3.select('svg');
  frame++; // = Math.round(frame + (settings.speed / 2));
  if (frame >= ballPositions.length) {
    toggle();
  }

  const ball = ballPositions[frame];
  const players = playerPositions[frame].players;

  // update the game and shot clock displays from the ball data
  const min = Math.round(ball.gr / 60);
  const sec = ((ball.gr) % 60).toFixed(2);
  $('#gc').html(`${min}:${sec}`);
  // no shot clock during free throws
  if (ball.sc) {
    $('#sc').html(`${ball.sc.toFixed(2)}`);
  }

  // update the style for the currently active roster and player "with ball"
  $('.headshot').removeClass('active has-ball selected');
  players.forEach((player) => {
    $(`#headshot-${player.pid}`).addClass('active');
  });
  const hasPid = ball.pid;
  $(`#headshot-${hasPid}`).addClass('has-ball');
  $(`#headshot-${selectedPid}`).addClass('selected');

  // update the circles for the ball position and size indicator
  svg.select('#ball')
    .data([ball])
    .attr('cx', d => d.x)
    .attr('cy', d => d.y);
  svg.select('#shot')
    .data([ball])
    .attr('r', d => d.r)
    .attr('cx', d => d.x)
    .attr('cy', d => d.y);

  // update the circles for the player positions
  svg.selectAll('.player')
    .data(players)
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', (d) => {
      if (d.pid === hasPid) {
        return config.ballPlayerSize;
      }
      if (d.pid === selectedPid) {
        return config.selectedPlayerSize;
      }
      return config.playerSize;
    })
    .attr('fill-opacity', (d) => {
      if (d.pid === hasPid) {
        return config.ballPlayerOpacity;
      }
      if (d.pid === selectedPid) {
        return config.selectedPlayerOpacity;
      }
      return config.playerOpacity;
    })
    .attr('stroke', (d) => {
      if (d.pid === hasPid) {
        return config.ballPlayerColor;
      }
      if (d.pid === selectedPid) {
        return config.selectedPlayerColor;
      }
      return d.tid === t1 ? config.t1Stroke : config.t2Stroke;
    })
    .attr('stroke-width', (d) => {
      if (d.pid === hasPid) {
        return config.ballPlayerStrokeWidth;
      }
      if (d.pid === selectedPid) {
        return config.selectedPlayerStrokeWidth;
      }
      return config.strokeWidth;
    })
    .attr('fill', (d) => {
      return d.tid === t1 ? config.t1Fill : config.t2Fill;
    });

  // update the ghosts
  if (settings.ghosts) {
    pGhosts = pGhosts.concat(players);
    svg.selectAll('.player-ghosts')
      .data(pGhosts)
      .enter()
      .append('circle')
      .attr('class', 'player-ghosts')
      .attr('r', config.ghostSize)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('stroke', d => d.tid === t1 ? config.t1Stroke : config.t2Stroke)
      .attr('stroke-opacity', config.ghostOpacity)
      .attr('fill', '#fff')
      .attr('fill-opacity', 0.0);
    bGhosts = bGhosts.concat([ball]);
    svg.selectAll('.ball-ghost')
      .data([ball])
      .enter()
      .append('circle')
      .attr('class', 'ball-ghosts')
      .attr('r', d => d.r)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('stroke', config.ballStroke)
      .attr('stroke-opacity', config.ghostOpacity)
      .attr('fill', '#fff')
      .attr('fill-opacity', 0.0);
  } else {
    pGhosts = [];
    bGhosts = [];
    svg.selectAll('.player-ghosts').remove();
    svg.selectAll('.ball-ghosts').remove();
  }
}

function initControls() {
  $('#toggle').click(toggle);
  $('#reset').click(reset);
  $('#ghost-chk').change((e) => {
    settings.ghosts = e.target.checked;
  });
  $('.speed').click((e) => {
    toggle();
    settings.speed = e.target.value;
    toggle();
  });
  $('.headshot').click((e) => {
    const newPid = e.target.id.replace('headshot-', '') * 1;
    if (newPid === selectedPid) {
      selectedPid = 0;
    } else {
      selectedPid = newPid;
    }
  });
}

function init(ballData, playerData, teamData) {
  console.log(ballData.length + ' ball readings');
  console.log(playerData.length + ' player readings');
  ballPositions = ballData;
  playerPositions = playerData;
  teams.init(teamData);
  t1 = teamData.home.teamid;
  frame = 0;
  const ball = ballPositions[frame];
  const players = playerPositions[frame].players;
  const svg = d3.select('svg');

  const all = [
    Object.assign({id: 'ball', className: 'ball'}, ball),
    Object.assign({id: 'shot', className: 'shot'}, ball),
  ].concat(players.map((player) => {
    return Object.assign({className: 'player'}, player);
  }));

  svg.selectAll('circle')
    .data(all)
    .enter()
    .append('circle')
    .attr('id', d => d.id)
    .attr('class', d => d.className);

  // setup the ball color with fixed size
  svg.select('#ball')
    .attr('r', config.ballSize)
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('stroke', config.ballStroke)
    .attr('stroke-opacity', config.ballOpacity)
    .attr('fill', config.ballFill)
    .attr('fill-opacity', config.ballOpacity);

  // setup the ball color with variable size to indicate vertical position
  svg.select('#shot')
    .attr('r', d => d.r)
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('stroke', config.shotStroke)
    .attr('stroke-opacity', config.shotOpacity)
    .attr('fill', config.shotFill)
    .attr('fill-opacity', config.shotOpacity);

  // setup the players with team colors and fixed size
  svg.selectAll('.player')
    .attr('r', config.playerSize)
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('stroke', d => d.tid === t1 ? config.t1Stroke : config.t2Stroke)
    .attr('stroke-opacity', config.playerOpacity)
    .attr('fill', d => d.tid === t1 ? config.t1Fill : config.t2Fill)
    .attr('fill-opacity', config.playerOpacity);

  initControls();
  toggle();
}

(function() {
  $.ajax('/data/ball/q1.json', {
    success: function(ballData) {
      $.ajax('/data/players/q1.json', {
        success: function(playerData) {
          $.ajax('/data/teams/1.json', {
            success: function(teamData) {
              init(ballData, playerData, teamData);
            },
          });
        },
      });
    },
  });
}());
