// 전역 스코프에서 함수 정의
window.searchAddress = async function() {
    const address = document.getElementById('address').value;
    if (!address) {
        alert('주소를 입력해주세요.');
        return;
    }

    try {
        const response = await new Promise((resolve, reject) => {
            naver.maps.Service.geocode({
                query: address
            }, function(status, response) {
                if (status === naver.maps.Service.Status.ERROR) {
                    reject('주소를 찾을 수 없습니다.');
                    return;
                }
                resolve(response);
            });
        });

        const result = response.v2.addresses[0];
        const latlng = new naver.maps.LatLng(result.y, result.x);
        
        map.setCenter(latlng);
        map.setZoom(15);
        updateMarkerPosition(latlng);
    } catch (error) {
        alert(error);
    }
}
