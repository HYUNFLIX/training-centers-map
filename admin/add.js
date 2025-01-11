
document.addEventListener('DOMContentLoaded', function() {
    let map, marker, searchResults = [];

    function initMap() {
        map = new naver.maps.Map('map', {
            center: new naver.maps.LatLng(36.5, 127.5),
            zoom: 7,
            zoomControl: true,
            zoomControlOptions: {
                position: naver.maps.Position.TOP_RIGHT
            }
        });

        naver.maps.Event.addListener(map, 'click', function(e) {
            updateMarker(e.coord);
            updateLocationInfo(e.coord);
        });
    }

    function updateMarker(coord) {
        if (!marker) {
            marker = new naver.maps.Marker({
                position: coord,
                map: map,
                draggable: true
            });
            naver.maps.Event.addListener(marker, 'dragend', function() {
                updateLocationInfo(marker.getPosition());
            });
        } else {
            marker.setPosition(coord);
        }
    }

    function updateLocationInfo(coord) {
        const locationInfo = document.getElementById('locationInfo');
        locationInfo.textContent = `위도: ${coord.lat().toFixed(6)}, 경도: ${coord.lng().toFixed(6)}`;
        locationInfo.classList.remove('hidden');
    }

    window.searchAddress = function() {
        const addressInput = document.getElementById('address');
        const searchButton = document.getElementById('searchButton');
        const resultsContainer = document.getElementById('searchResults');
        const addressError = document.getElementById('addressError');

        if (!addressInput.value) {
            showAddressError('주소를 입력해주세요.');
            return;
        }

        searchButton.disabled = true;
        searchButton.textContent = '검색 중...';

        const geocoder = new naver.maps.Service.Geocoder();
        geocoder.geocode({ query: addressInput.value }, function(status, response) {
            searchButton.disabled = false;
            searchButton.textContent = '검색';

            if (status !== naver.maps.Service.Status.OK || !response || !response.v2.addresses.length) {
                showAddressError('검색된 주소가 없습니다.');
                resultsContainer.innerHTML = '';
                return;
            }

            searchResults = response.v2.addresses;
            displaySearchResults(searchResults);
        });
    };

    function displaySearchResults(results) {
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = '';
        resultsContainer.classList.remove('hidden');

        results.forEach(result => {
            const div = document.createElement('div');
            div.textContent = result.roadAddress || result.jibunAddress;
            div.className = 'p-2 hover:bg-gray-100 cursor-pointer';
            div.onclick = function() {
                const coord = new naver.maps.LatLng(result.y, result.x);
                map.setCenter(coord);
                map.setZoom(15);
                updateMarker(coord);
                updateLocationInfo(coord);
                resultsContainer.classList.add('hidden');
            };
            resultsContainer.appendChild(div);
        });
    }

    function showAddressError(message) {
        const addressError = document.getElementById('addressError');
        addressError.textContent = message;
        addressError.classList.remove('hidden');
    }

    const form = document.getElementById('centerForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!marker) {
            alert('지도에서 위치를 선택해주세요.');
            return;
        }

        // Collect data from form inputs
        const data = {
            name: document.getElementById('name').value,
            branch: document.getElementById('branch').value,
            address: document.getElementById('address').value,
            basicInfo: document.getElementById('basicInfo').value,
            naverLink: document.getElementById('naverLink').value,
            websiteLink: document.getElementById('websiteLink').value,
            location: {
                lat: marker.getPosition().lat(),
                lng: marker.getPosition().lng()
            }
        };

        console.log('Form data:', data);
        alert('연수원이 성공적으로 등록되었습니다.');
    });

    initMap();
});
