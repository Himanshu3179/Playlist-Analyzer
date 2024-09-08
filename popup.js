document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    let url = new URL(tabs[0].url);
    let playlistId = url.searchParams.get('list');

    if (playlistId) {
      fetchPlaylistSummary(playlistId);
    } else {
      document.getElementById('result').innerText = 'Playlist not found';
    }
  });

  const slider = document.getElementById('dailyTime');
  const sliderValue = document.getElementById('sliderValue');
  slider.addEventListener('input', () => {
    sliderValue.textContent = slider.value;
    calculateCompletionTime();
  });

  // Calculate the completion time with the default slider value on load
  slider.addEventListener('change', calculateCompletionTime);
});

const apiKey = ''; // Your API key
let totalDuration = 0; // Declare totalDuration here

function fetchPlaylistSummary(playlistId) {
  let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}`;

  let totalVideos = 0;

  function fetchNextPage(pageToken = '') {
    fetch(`${url}&pageToken=${pageToken}`)
      .then(response => response.json())
      .then(data => {
        if (data.items && data.items.length > 0) {
          totalVideos += data.items.length;
          let videoIds = data.items.map(item => item.contentDetails.videoId);
          fetchVideoDurations(videoIds, () => {
            if (data.nextPageToken) {
              fetchNextPage(data.nextPageToken);
            } else {
              updateResults(totalVideos, totalDuration);
              showControls(); // Show the slider and text
            }
          });
        } else {
          document.getElementById('result').innerText = 'Playlist not found or empty';
        }
      })
      .catch(error => {
        console.error('Error fetching playlist data:', error);
        document.getElementById('result').innerText = 'Error fetching playlist data: ' + error.message;
      });
  }

  fetchNextPage();
}

function fetchVideoDurations(videoIds, callback) {
  let url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(',')}&key=${apiKey}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      data.items.forEach(item => {
        let duration = item.contentDetails.duration;
        let match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        let hours = (parseInt(match[1]) || 0);
        let minutes = (parseInt(match[2]) || 0);
        let seconds = (parseInt(match[3]) || 0);
        let videoDuration = hours * 3600 + minutes * 60 + seconds;

        totalDuration += videoDuration; // Use the declared totalDuration
      });

      callback();
    })
    .catch(error => {
      console.error('Error fetching video data:', error);
      document.getElementById('result').innerText = 'Error fetching video data: ' + error.message;
    });
}

function formatDuration(seconds) {
  let hours = Math.floor(seconds / 3600);
  let minutes = Math.floor((seconds % 3600) / 60);
  seconds = seconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function updateResults(totalVideos, totalDuration) {
  const resultElement = document.getElementById('result');
  resultElement.innerHTML = `
    <h4>Total videos: ${totalVideos}</h4>
    <h4>Total duration: ${formatDuration(totalDuration)}</h4>
  `;
}

function showControls() {
  // Show the slider and label
  document.querySelector('input[type="range"]').style.display = 'block';
  document.querySelector('label').style.display = 'block';

  // Calculate the completion time with the default value
  calculateCompletionTime();
}

function calculateCompletionTime() {
  const timePerDay = parseFloat(document.getElementById('dailyTime').value);
  if (isNaN(timePerDay) || timePerDay <= 0) {
    document.getElementById('result').innerHTML += `
      <p class="result">Please enter a valid number of hours per day.</p>
    `;
    return;
  }

  const totalHours = totalDuration / 3600;
  const daysRequired = Math.ceil(totalHours / timePerDay);

  // Clear previous completion result before appending new one
  const resultElement = document.getElementById('result');
  const completionResult = document.getElementById('completionResult');
  if (completionResult) {
    resultElement.removeChild(completionResult);
  }

  const newCompletionResult = document.createElement('p');
  newCompletionResult.id = 'completionResult';
  newCompletionResult.className = 'result';
  newCompletionResult.innerHTML = `Time Required to Complete Playlist: ${daysRequired} days`;
  resultElement.appendChild(newCompletionResult);
}
