let map;
let markers = [];

// Initialize the Google Maps
// async function initMap() {
//     map = new google.maps.Map(document.getElementById("map"), {
//         center: { lat: 20.5937, lng: 78.9629 }, // Default center: India
//         zoom: 5,
//         mapTypeControl: true,
//         fullscreenControl: true,
//         streetViewControl: false,
//         styles: [
//             {
//                 featureType: "poi",
//                 elementType: "labels",
//                 stylers: [{ visibility: "off" }]
//             }
//         ]
//     });
// }


window.initMap = function() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5,
        mapTypeControl: true,
        fullscreenControl: true,
        streetViewControl: false,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }]}]
    });
};

function getStarRating(rating) {
    if (rating === 'No rating') return '<span class="no-rating">No ratings yet</span>';
    
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let starsHtml = '';
    
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<span class="star full">★</span>';
    }
    if (halfStar) {
        starsHtml += '<span class="star half">★</span>';
    }
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<span class="star empty">☆</span>';
    }
    
    return `<div class="rating">${starsHtml} <span class="rating-value">(${rating})</span></div>`;
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('pincodeForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pincode = document.getElementById('pincode').value;
        const radius = document.getElementById('radius')?.value || 10;
        
        // Show loading spinner
        const loadingContainer = document.createElement('div');
        loadingContainer.className = 'loading-container';
        loadingContainer.innerHTML = `
            <div class="spinner"></div>
            <p>Searching for cold storage facilities...</p>
        `;
        document.getElementById('result').innerHTML = '';
        document.getElementById('result').appendChild(loadingContainer);
        loadingContainer.style.display = 'block';

        try {
            // LINK HERE
            // const res = await fetch('/get-cold-storage', {
            const res = await fetch(`${rootUrl}/get-cold-storage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `pincode=${pincode}&radius=${radius}`
            });

            const data = await res.json();
            const resultDiv = document.getElementById('result');

            if (data.error) {
                loadingContainer.style.display = 'none';
                resultDiv.innerHTML = `<div class="error">${data.error}</div>`;
                document.getElementById("map").style.display = "none";
            } else {
                loadingContainer.style.display = 'none';
                const resultCount = data.cold_storage.length;
                resultDiv.innerHTML = `
                    <h3>Found ${resultCount} Cold Storage Facilities${data.has_more ? ' (showing first ' + resultCount + ')' : ''} within ${radius}km:</h3>
                    <ul class="facility-list">
                `;
                
                const bounds = new google.maps.LatLngBounds();

                markers.forEach(m => m.setMap(null));
                markers = [];

                data.cold_storage.sort((a, b) => {
                    const ratingA = typeof a.rating === 'number' ? a.rating : 0;
                    const ratingB = typeof b.rating === 'number' ? b.rating : 0;
                    return ratingB - ratingA;
                });
                data.cold_storage.forEach((facility, index) => {
                    const ratingHtml = getStarRating(facility.rating);
                    
                    resultDiv.innerHTML += `
                        <li class="facility-item">
                            <div class="facility-number">${index + 1}</div>
                            <div class="facility-content">
                                <strong class="facility-name">${facility.name}</strong>
                                ${ratingHtml}
                                <div class="facility-address">${facility.address}</div>
                            </div>
                            <div class="facility-actions">
                                <a href="https://www.google.com/maps/search/?api=1&query=${facility.lat},${facility.lng}&query_place_id=${facility.place_id || ''}" target="_blank" class="info-btn" title="View on Maps">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                </a>
                                <a href="https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}&destination_place_id=${facility.place_id || ''}" target="_blank" class="directions-btn" title="Get Directions">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M21.71 11.29l-9-9a.996.996 0 00-1.41 0l-9 9a.996.996 0 000 1.41l9 9c.39.39 1.02.39 1.41 0l9-9a.996.996 0 000-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z"/></svg>
                                </a>
                            </div>
                        </li>
                    `;

                    const pos = { lat: facility.lat, lng: facility.lng };
                    const marker = new google.maps.Marker({
                        position: pos,
                        map: map,
                        title: facility.name,
                        animation: google.maps.Animation.DROP,
                        label: {
                            text: (index + 1).toString(),
                            color: '#fff'
                        }
                    });
                    
                    const infoContent = `
                        <div class="info-window">
                            <strong>${facility.name}</strong>
                            ${ratingHtml}
                            <div>${facility.address}</div>
                        </div>
                    `;
                    
                    const infowindow = new google.maps.InfoWindow({
                        content: infoContent
                    });
                    
                    marker.addListener('click', () => {
                        infowindow.open(map, marker);
                    });
                    
                    markers.push(marker);
                    bounds.extend(pos);
                });

                resultDiv.innerHTML += `</ul>`;
                
                if (data.has_more) {
                    resultDiv.innerHTML += `
                        <div class="more-results">
                            There are more results available. Try refining your search for more specific results.
                        </div>
                    `;
                }

                map.fitBounds(bounds);
                document.getElementById("map").style.display = "block";
            }
        } catch (error) {
            console.log(error)
            document.getElementById('result').innerHTML = `<div class="error">Connection error. Please check if the server is running.</div>`;
        }
    });
}); 