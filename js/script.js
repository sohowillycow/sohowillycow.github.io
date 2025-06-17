(() => {
  /* ------------------------------------------------------------------
     Search form toggle
     ------------------------------------------------------------------ */
  const searchWrap = document.getElementById('search-form-wrap');
  let isSearchAnim = false;
  const searchAnimDuration = 200;

  const startSearchAnim = () => { isSearchAnim = true; };
  const stopSearchAnim = cb => {
    setTimeout(() => {
      isSearchAnim = false;
      if (cb) cb();
    }, searchAnimDuration);
  };

  document.querySelectorAll('.nav-search-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isSearchAnim) return;
      startSearchAnim();
      searchWrap.classList.add('on');
      stopSearchAnim(() => {
        const input = document.querySelector('.search-form-input');
        if (input) input.focus();
      });
    });
  });

  const searchInput = document.querySelector('.search-form-input');
  if (searchInput) {
    searchInput.addEventListener('blur', () => {
      startSearchAnim();
      searchWrap.classList.remove('on');
      stopSearchAnim();
    });
  }

  /* ------------------------------------------------------------------
     Share box handling
     ------------------------------------------------------------------ */
  document.body.addEventListener('click', () => {
    document.querySelectorAll('.article-share-box.on').forEach(box => box.classList.remove('on'));
  });

  document.body.addEventListener('click', e => {
    const link = e.target.closest('.article-share-link');
    if (!link) return;
    e.stopPropagation();

    const url = link.dataset.url;
    const encodedUrl = encodeURIComponent(url);
    const id = 'article-share-box-' + link.dataset.id;
    const title = link.dataset.title;
    let box = document.getElementById(id);

    if (box) {
      if (box.classList.contains('on')) {
        box.classList.remove('on');
        return;
      }
    } else {
      const html = `
        <div id="${id}" class="article-share-box">
          <input class="article-share-input" value="${url}">
          <div class="article-share-links">
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodedUrl}" class="article-share-twitter" target="_blank" title="Twitter"><span class="fa fa-twitter"></span></a>
            <a href="https://www.facebook.com/sharer.php?u=${encodedUrl}" class="article-share-facebook" target="_blank" title="Facebook"><span class="fa fa-facebook"></span></a>
            <a href="http://pinterest.com/pin/create/button/?url=${encodedUrl}" class="article-share-pinterest" target="_blank" title="Pinterest"><span class="fa fa-pinterest"></span></a>
            <a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}" class="article-share-linkedin" target="_blank" title="LinkedIn"><span class="fa fa-linkedin"></span></a>
          </div>
        </div>`;
      box = document.createRange().createContextualFragment(html).firstElementChild;
      document.body.appendChild(box);
    }

    document.querySelectorAll('.article-share-box.on').forEach(el => {
      if (el !== box) el.classList.remove('on');
    });

    const rect = link.getBoundingClientRect();
    box.style.top = rect.top + window.pageYOffset + 25 + 'px';
    box.style.left = rect.left + window.pageXOffset + 'px';
    box.classList.add('on');
  });

  document.body.addEventListener('click', e => {
    if (e.target.closest('.article-share-box')) e.stopPropagation();
  });

  document.body.addEventListener('click', e => {
    if (e.target.classList.contains('article-share-box-input')) {
      e.target.select();
    }
  });

  document.body.addEventListener('click', e => {
    const link = e.target.closest('.article-share-box-link');
    if (!link) return;
    e.preventDefault();
    e.stopPropagation();
    window.open(link.href, 'article-share-box-window-' + Date.now(), 'width=500,height=450');
  });

  /* ------------------------------------------------------------------
     Image captions and lightbox links
     ------------------------------------------------------------------ */
  document.querySelectorAll('.article-entry').forEach((entry, i) => {
    entry.querySelectorAll('img').forEach(img => {
      const parent = img.parentElement;
      if (parent.classList.contains('fancybox') || parent.tagName.toLowerCase() === 'a') return;

      const alt = img.alt;
      if (alt) {
        const span = document.createElement('span');
        span.className = 'caption';
        span.textContent = alt;
        img.insertAdjacentElement('afterend', span);
      }

      const wrapper = document.createElement('a');
      wrapper.href = img.src;
      wrapper.setAttribute('data-fancybox', 'gallery');
      wrapper.setAttribute('data-caption', alt);
      parent.insertBefore(wrapper, img);
      wrapper.appendChild(img);
    });

    entry.querySelectorAll('.fancybox').forEach(node => {
      node.setAttribute('rel', 'article' + i);
    });
  });

  /* ------------------------------------------------------------------
     Mobile navigation toggle
     ------------------------------------------------------------------ */
  const container = document.getElementById('container');
  let isMobileNavAnim = false;
  const mobileNavAnimDuration = 200;

  const startMobileNavAnim = () => { isMobileNavAnim = true; };
  const stopMobileNavAnim = () => {
    setTimeout(() => { isMobileNavAnim = false; }, mobileNavAnimDuration);
  };

  const mainNavToggle = document.getElementById('main-nav-toggle');
  if (mainNavToggle) {
    mainNavToggle.addEventListener('click', () => {
      if (isMobileNavAnim) return;
      startMobileNavAnim();
      container.classList.toggle('mobile-nav-on');
      stopMobileNavAnim();
    });
  }

  const wrap = document.getElementById('wrap');
  if (wrap) {
    wrap.addEventListener('click', () => {
      if (isMobileNavAnim || !container.classList.contains('mobile-nav-on')) return;
      container.classList.remove('mobile-nav-on');
    });
  }
})();
