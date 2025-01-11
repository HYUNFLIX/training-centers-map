// 주소 검색 함수
window.searchAddress = async function() {
    const address = document.getElementById('address').value;
    const errorElement = document.getElementById('addressError');
    
    if (!address) {
        showAddressError('주소를 입력해 주세요.');
        return;
    }

    try {
        naver.maps.Service.geocode({
            query: address
        }, function(status, response) {
            if (status === naver.maps.Service.Status.ERROR) {
                showAddressError('주소 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
                return;
            }
            
            if (response.v2.meta.totalCount === 0) {
                showAddressError('검색된 주소가 없습니다. 주소를 다시 확인해 주세요.');
                return;
            }
            
            const result = response.v2.addresses[0];
            const latlng = new naver.maps.LatLng(result.y, result.x);
            
            hideAddressError();
            map.setCenter(latlng);
            map.setZoom(15);
            updateMarkerPosition(latlng);
        });
    } catch (error) {
        console.error('주소 검색 실패:', error);
        showAddressError('주소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
}

// 주소 검색 에러 메시지 표시
function showAddressError(message) {
    const errorElement = document.getElementById('addressError');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

// 주소 검색 에러 메시지 숨기기
function hideAddressError() {
    const errorElement = document.getElementById('addressError');
    errorElement.classList.add('hidden');
}
