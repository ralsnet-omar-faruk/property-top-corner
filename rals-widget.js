(function () {
  const API_BASE_URL = 'https://ralsnet.example.formatline.com/wp-json/rengodb/v1/search-properties';
  const DETAIL_PAGE_BASE_URL = 'https://ralsnet.example.formatline.com/property/';
  const IMAGE_BASE_URL = 'https://pic.cbiz.ne.jp/pic/';

  function loadCSS() {
    if (document.querySelector('link[data-rals="css"]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = './rals-widget.css';
    l.setAttribute('data-rals', 'css');
    document.head.appendChild(l);
  }

  // Format price in 万円 (man yen) format like uchiike
  function formatPrice(price) {
    if (!price) return '価格未定';

    const man = Math.floor(price / 10000);
    const remainder = price % 10000;

    if (remainder === 0) {
      return `${man}万円`;
    } else {
      const decimal = remainder / 10000;
      return `${man + decimal}万円`;
    }
  }

  // Format area in 坪 (tsubo) format like uchiike
  function formatArea(area) {
    if (!area) return '';

    // Convert from square meters to tsubo (坪)
    // 1 tsubo = 3.30579 square meters
    const tsubo = area / 3.30579;
    const roundedTsubo = Math.round(tsubo * 10) / 10; // Round to 1 decimal place

    return `${roundedTsubo}坪(${area}㎡)`;
  }

  // Get traffic information from jsonTraffic field (like uchiike does)
  function getTrafficInfo(item) {
    if (item.jsonTraffic && Array.isArray(item.jsonTraffic) && item.jsonTraffic.length > 0) {
      // Sort by walking time to get the closest station first
      const sortedTraffic = item.jsonTraffic
        .filter(traffic => traffic.transport_min_station !== null || traffic.transport_min_bus !== null)
        .sort((a, b) => {
          const timeA = a.transport_min_station || a.transport_min_bus || 999;
          const timeB = b.transport_min_station || b.transport_min_bus || 999;
          return timeA - timeB;
        });

      if (sortedTraffic.length > 0) {
        const firstTraffic = sortedTraffic[0];

        // Handle train stations
        if (firstTraffic.station_name && firstTraffic.transport_min_station) {
          return `${firstTraffic.station_name}(徒歩${firstTraffic.transport_min_station}分)`;
        }

        // Handle bus stops
        if (firstTraffic.bus_info && firstTraffic.transport_min_bus) {
          // Clean up the bus info (remove extra spaces)
          const busInfo = firstTraffic.bus_info.trim();
          return `${busInfo}(徒歩${firstTraffic.transport_min_bus}分)`;
        }
      }
    }

    // Fallback to trafficDataStr if jsonTraffic is not available
    if (item.trafficDataStr && item.trafficDataStr.trim() !== '') {
      const trafficItems = item.trafficDataStr.split(' / ');
      if (trafficItems.length > 0) {
        const firstTraffic = trafficItems[0].trim();
        const match = firstTraffic.match(/^(.+?)\s+徒歩(\d+)分/);
        if (match) {
          const stationName = match[1].trim();
          const walkTime = match[2];
          return `${stationName}(徒歩${walkTime}分)`;
        }
        return firstTraffic;
      }
    }

    return '';
  }

  // Get address in the same format as uchiike
  function getAddress(item) {
    const addressParts = [];
    if (item.area1Name) addressParts.push(item.area1Name);
    if (item.area2Name) addressParts.push(item.area2Name);
    if (item.area3Name) addressParts.push(item.area3Name);
    if (item.area4) addressParts.push(item.area4);
    return addressParts.join('');
  }

  function createCard(item, detailBaseUrl) {
    const price = formatPrice(item.propertyPrice);
    const detailUrl = `${detailBaseUrl}${item.buildingMasterId}`;
    const address = getAddress(item);
    const traffic = getTrafficInfo(item);
    const area = formatArea(item.exclusiveSize);

    let thumbnailUrl = 'https://ralsnet.example.formatline.com/app/plugins/wp-rengodb/assets/img/noimg.png';
    const supplierId = item.supplierId || 2000;
    const buildingId = item.buildingId;
    const propertyId = item.propertyId;

    // Enhanced image selection logic (same as before)
    if (item.delegateImgBuilding && item.delegateImgBuilding > 0) {
      const imageNumber = item.delegateImgBuilding;
      if (imageNumber === 1) {
        thumbnailUrl = `${IMAGE_BASE_URL}${supplierId}/c-${supplierId}-${buildingId}-g.jpg`;
      } else {
        const adjustedNumber = imageNumber - 1;
        thumbnailUrl = `${IMAGE_BASE_URL}${supplierId}/c-${supplierId}-${buildingId}-${adjustedNumber}.jpg`;
      }
    } else if (item.delegateImg && item.delegateImg > 0) {
      const imageNumber = item.delegateImg;
      const adjustedNumber = Math.max(1, imageNumber - 1);
      const propertyImage = item.propertyImages?.find(img => img.number === imageNumber);
      if (propertyImage && propertyImage.category === 'layout') {
        if (imageNumber === 1) {
          thumbnailUrl = `${IMAGE_BASE_URL}${supplierId}/r-${supplierId}-${propertyId}-m.jpg`;
        } else {
          thumbnailUrl = `${IMAGE_BASE_URL}${supplierId}/r-${supplierId}-${propertyId}-${adjustedNumber}.jpg`;
        }
      } else {
        thumbnailUrl = `${IMAGE_BASE_URL}${supplierId}/r-${supplierId}-${propertyId}-${adjustedNumber}.jpg`;
      }
    } else {
      if (item.images && item.images.length > 0) {
        const selectedImage = item.images.find(img => img.category === 'exterior') || item.images[0];
        if (selectedImage) {
          const imageNumber = selectedImage.number;
          const category = selectedImage.category;
          if (category === 'exterior') {
            if (imageNumber === 1) {
              thumbnailUrl = `${IMAGE_BASE_URL}${supplierId}/c-${supplierId}-${buildingId}-g.jpg`;
            } else {
              const adjustedNumber = imageNumber - 1;
              thumbnailUrl = `${IMAGE_BASE_URL}${supplierId}/c-${supplierId}-${buildingId}-${adjustedNumber}.jpg`;
            }
          } else if (category === 'layout') {
            if (imageNumber === 1) {
              thumbnailUrl = `${IMAGE_BASE_URL}${supplierId}/r-${supplierId}-${propertyId}-m.jpg`;
            } else {
              const adjustedNumber = imageNumber - 1;
              thumbnailUrl = `${IMAGE_BASE_URL}${supplierId}/r-${supplierId}-${propertyId}-${adjustedNumber}.jpg`;
            }
          } else {
            const adjustedNumber = Math.max(1, imageNumber - 1);
            thumbnailUrl = `${IMAGE_BASE_URL}${supplierId}/r-${supplierId}-${propertyId}-${adjustedNumber}.jpg`;
          }
        }
      }
    }

    const imageHtml = thumbnailUrl ?
      `<img src="${thumbnailUrl}" alt="物件画像" class="property-img"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
       <div class="rals-alt-text" style="display:none;">物件画像</div>` :
      `<div class="rals-alt-text">物件画像</div>`;

    return `
      <div class="property-card">
        <div class="property-image">
          ${imageHtml}
        </div>
        <div class="property-info">
          <div class="property-rent">賃料: ${price}</div>
          <div class="property-details">
            ${traffic ? `${traffic}<br>` : ''}
            ${address}<br>
            ${area}
          </div>
          <a href="${detailUrl}" target="_blank" rel="noopener noreferrer" class="property-detail-btn">
            物件詳細を見る
          </a>
        </div>
      </div>`;
  }

  function render(container, list, detailBaseUrl) {
    if (!list || !list.length) {
      container.innerHTML = '<p>No properties found.</p>';
      return;
    }
    container.classList.add('rals-widget-container');
    container.innerHTML = `
      <div class="properties-grid">
        <div class="property-cards">
          ${list.map(item => createCard(item, detailBaseUrl)).join('')}
        </div>
      </div>
    `;
  }

  function init() {
    loadCSS();
    document.querySelectorAll('.rals-widget').forEach(container => {
      const supplier = container.dataset.supplier || '2000';
      const prop = container.dataset.prop || '2';
      const apiBase = container.dataset.api || API_BASE_URL;
      const detailBaseUrl = container.dataset.detailUrl || DETAIL_PAGE_BASE_URL;
      let url = `${apiBase}?sup=${supplier}&prop=${prop}`;
      if (container.dataset.limit) {
        url += `&limit=${container.dataset.limit}`;
      }

      const customColor = container.dataset.color;
      const customHoverColor = container.dataset.hoverColor;
      const customCardBg = container.dataset.cardBg;

      if (customColor) {
        container.style.setProperty('--rals-main-color', customColor);
      }
      if (customHoverColor) {
        container.style.setProperty('--rals-hover-color', customHoverColor);
      }
      if (customCardBg) {
        container.style.setProperty('--rals-card-bg', customCardBg);
      }

      container.innerHTML = '<p>Loading properties...</p>';
      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.json();
        })
        .then(data => render(container, data, detailBaseUrl))
        .catch(error => {
          console.error('Error:', error);
          container.innerHTML = '<p>Error loading properties. Please try again later.</p>';
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();