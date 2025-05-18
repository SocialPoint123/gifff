// Theme switchers
const themes = ['hacker-theme', 'comment-theme', 'retweet-theme'];
function setTheme(idx) {
  document.body.className = themes[idx % themes.length];
}

// Util
function timeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds/60);
  if (mins < 60) return mins + 'm';
  const hrs = Math.floor(mins/60);
  if (hrs < 24) return hrs + 'h';
  return date.toLocaleDateString();
}

// Posts Data
const postsFile = 'data/posts.json';

async function loadPosts() {
  try {
    const res = await fetch(postsFile);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function savePost(post) {
  let posts = JSON.parse(localStorage.getItem('sharkPosts') || '[]');
  posts.unshift(post);
  localStorage.setItem('sharkPosts', JSON.stringify(posts));
}

function getSavedPosts() {
  return JSON.parse(localStorage.getItem('sharkPosts') || '[]');
}

function saveAllPosts(posts) {
  localStorage.setItem('sharkPosts', JSON.stringify(posts));
}

// ==== Twitter Embedding ====
function isTwitterUrl(str) {
  return /(https?:\/\/(www\.)?(twitter|x)\.com\/[^\/]+\/status\/\d+)/.test(str);
}
function extractTweetUrl(str) {
  const match = str.match(/https?:\/\/(www\.)?(twitter|x)\.com\/[^\/]+\/status\/\d+/);
  return match ? match[0] : null;
}

// ==== Render Feed ====
async function renderFeed() {
  let posts = getSavedPosts();
  try {
    const defaultPosts = await loadPosts();
    posts = posts.concat(defaultPosts.filter(dp => !posts.find(p => p.time === dp.time && p.content === dp.content)));
  } catch {}
  const feed = document.getElementById('feed');
  feed.innerHTML = "";
  posts.forEach((post, idx) => {
    const tpl = document.getElementById('postTemplate').content.cloneNode(true);
    const contentElem = tpl.querySelector('.content');
    const tweetUrl = extractTweetUrl(post.content);

    if (tweetUrl) {
      contentElem.innerHTML = `<blockquote class="twitter-tweet"><a href="${tweetUrl}"></a></blockquote>`;
    }
    // ถ้ามีข้อความปกติด้วย ให้แสดงก่อน embed
    if (post.content.replace(tweetUrl||'','').trim()) {
      const normalText = document.createElement('div');
      normalText.textContent = post.content.replace(tweetUrl||'','').trim();
      contentElem.appendChild(normalText);
    }
    if (!tweetUrl) {
      contentElem.textContent = post.content;
    }

    tpl.querySelector('.time').textContent = timeAgo(new Date(post.time));
    if (post.img) {
      const img = tpl.querySelector('.post-img');
      img.src = post.img;
      img.style.display = '';
    }
    // Add delete button
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.className = 'delete';
    delBtn.title = 'Delete this post (password required)';
    delBtn.dataset.idx = idx;
    tpl.querySelector('.post-header').appendChild(delBtn);
    feed.appendChild(tpl);
  });

  // โหลด widget ของ Twitter สำหรับ embed (โหลดครั้งเดียวพอ)
  if (!document.getElementById('twitter-wjs')) {
    const s = document.createElement('script');
    s.id = 'twitter-wjs';
    s.src = 'https://platform.twitter.com/widgets.js';
    document.body.appendChild(s);
  } else if (window.twttr && window.twttr.widgets) {
    window.twttr.widgets.load(feed);
  }
}

// ==== Form Handler ====
document.getElementById('postForm').addEventListener('submit', async e => {
  e.preventDefault();
  const content = document.getElementById('postContent').value.trim();
  const imgFile = document.getElementById('postImage').files[0];
  if (!content) return;

  // Password Prompt
  const pw = prompt("Enter password to post:");
  if (pw !== "adminpp") {
    alert("Incorrect password!");
    return;
  }

  // Read image file as DataURL
  let imgData = "";
  if (imgFile) {
    imgData = await new Promise(res => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(imgFile);
    });
  }

  const post = {
    content,
    img: imgData,
    time: new Date().toISOString()
  };
  await savePost(post);
  document.getElementById('postForm').reset();
  renderFeed();
});

// ==== Like/Comment/Retweet/DELETE actions ====
document.getElementById('feed').addEventListener('click', (e) => {
  if (e.target.classList.contains('like')) setTheme(0);
  if (e.target.classList.contains('comment')) setTheme(1);
  if (e.target.classList.contains('retweet')) setTheme(2);
  if (e.target.classList.contains('delete')) {
    const idx = e.target.dataset.idx;
    const pw = prompt("Enter password to delete this post:");
    if (pw !== "adminpp") {
      alert("Incorrect password!");
      return;
    }
    let posts = getSavedPosts();
    posts.splice(idx, 1);
    saveAllPosts(posts);
    renderFeed();
  }
});

// ==== Initial render ====
renderFeed();
