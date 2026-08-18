import { createOptimizedPicture, loadCSS, loadScript } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

async function loadSplide() {
  const base = `${window.hlx.codeBasePath}/blocks/content-cards`;
  await Promise.all([
    loadCSS(`${base}/splide-core.min.css`),
    loadScript(`${base}/splide.min.js`),
  ]);
  return window.Splide;
}

export default function decorate(block) {
  const firstRow = block.children[0];
  const isHeadingRow = firstRow && !firstRow.querySelector('picture');
  const headingText = isHeadingRow ? firstRow.textContent.trim() : '';
  if (isHeadingRow) firstRow.remove();

  const rows = [...block.children];

  const list = document.createElement('ul');
  list.className = 'splide__list';
  // field order per the content-card model: image, cardHeading, text, link
  rows.forEach((row) => {
    const li = document.createElement('li');
    li.className = 'splide__slide content-cards-card';
    moveInstrumentation(row, li);

    const [imageDiv, headingDiv, textDiv, linkDiv] = row.children;

    if (imageDiv) {
      imageDiv.className = 'content-cards-card-image';
      li.append(imageDiv);
    }

    const body = document.createElement('div');
    body.className = 'content-cards-card-body';

    if (headingDiv && headingDiv.textContent.trim()) {
      const h3 = document.createElement('h3');
      moveInstrumentation(headingDiv, h3);
      const wrapperP = headingDiv.children.length === 1 && headingDiv.firstElementChild.tagName === 'P'
        ? headingDiv.firstElementChild : headingDiv;
      h3.append(...wrapperP.childNodes);
      body.append(h3);
    }

    if (textDiv) {
      moveInstrumentation(textDiv, body);
      body.append(...textDiv.childNodes);
    }

    const link = linkDiv?.querySelector('a');
    if (link) {
      const p = document.createElement('p');
      p.className = 'button-wrapper';
      moveInstrumentation(linkDiv, p);
      link.className = 'button';
      p.append(link);
      body.append(p);
    }

    li.append(body);
    list.append(li);
  });

  list.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [
      { media: '(min-width: 600px)', width: '750' },
      { width: '500' },
    ]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'content-cards-inner';

  if (headingText) {
    const h2 = document.createElement('h2');
    h2.className = 'content-cards-heading';
    h2.textContent = headingText;
    wrapper.append(h2);
  }

  const splideEl = document.createElement('div');
  splideEl.className = 'splide content-cards-splide';

  const track = document.createElement('div');
  track.className = 'splide__track';
  track.append(list);
  splideEl.append(track);

  wrapper.append(splideEl);
  block.replaceChildren(wrapper);

  const slideCount = list.children.length;

  if (slideCount > 1) {
    const nav = document.createElement('ul');
    nav.className = 'content-cards-pagination';
    const dots = [...Array(slideCount)].map((_, i) => {
      const li = document.createElement('li');
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      li.append(dot);
      nav.append(li);
      return dot;
    });
    dots[0].classList.add('is-active');
    wrapper.append(nav);

    loadSplide().then((Splide) => {
      const splide = new Splide(splideEl, {
        type: 'loop',
        perPage: 3,
        gap: '1.5rem',
        pagination: false,
        arrows: false,
        breakpoints: {
          900: { perPage: 3 },
          600: { perPage: 2, padding: { right: '2rem', left: '2rem' } },
          599: { perPage: 1, padding: { right: '2rem', left: '2rem' } },
        },
      }).mount();

      dots.forEach((dot, i) => {
        dot.addEventListener('click', () => splide.go(i));
      });
      splide.on('move', (newIndex) => {
        const realIndex = ((newIndex % slideCount) + slideCount) % slideCount;
        dots.forEach((dot, i) => dot.classList.toggle('is-active', i === realIndex));
      });
    });
  }
}
