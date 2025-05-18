// ... (โค้ดเดิมด้านบน)

function isTwitterUrl(str) {
  // รองรับทั้ง twitter.com และ x.com
  return /(https?:\/\/(www\.)?(twitter|x)\.com\/[^\/]+\/status\/\d+)/.test(str);
}
function extractTweetUrl(str) {
  // คืนลิงก์ทวีตแรกที่เจอ
  const match = str.match(/https?:\/\/(www\.)?(twitter|x)\.com\/[^\/]+\/status\/\d+/);
  return match ? match[0] : null;
}

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
      // ถ้ามีลิงก์ Twitter ให้ฝัง embed
      contentElem.innerHTML = `<blockquote class="twitter-tweet"><a href="${tweetUrl}"></a></blockquote>`;
    } else {
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

// ... (โค้ดเดิมด้านล่าง)