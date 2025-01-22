// 네이버 지도 초기화 및 마커 클러스터링 구현
var map = new naver.maps.Map("map", {
    zoom: 6,
    center: new naver.maps.LatLng(36.2253017, 127.6460516),
    zoomControl: true,
    zoomControlOptions: {
        position: naver.maps.Position.TOP_LEFT,
        style: naver.maps.ZoomControlStyle.SMALL
    }
});

var markers = [];

var htmlMarker1 = {
        content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:url('+ HOME_PATH +'/img/cluster-marker-1.png);background-size:contain;"></div>',
        size: new naver.maps.Size(40, 40),
        anchor: new naver.maps.Point(20, 20)
    },
    htmlMarker2 = {
        content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:url('+ HOME_PATH +'/img/cluster-marker-2.png);background-size:contain;"></div>',
        size: new naver.maps.Size(40, 40),
        anchor: new naver.maps.Point(20, 20)
    },
    htmlMarker3 = {
        content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:url('+ HOME_PATH +'/img/cluster-marker-3.png);background-size:contain;"></div>',
        size: new naver.maps.Size(40, 40),
        anchor: new naver.maps.Point(20, 20)
    },
    htmlMarker4 = {
        content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:url('+ HOME_PATH +'/img/cluster-marker-4.png);background-size:contain;"></div>',
        size: new naver.maps.Size(40, 40),
        anchor: new naver.maps.Point(20, 20)
    },
    htmlMarker5 = {
        content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:url('+ HOME_PATH +'/img/cluster-marker-5.png);background-size:contain;"></div>',
        size: new naver.maps.Size(40, 40),
        anchor: new naver.maps.Point(20, 20)
    };

function loadCenters(data) {
    for (var i = 0, ii = data.length; i < ii; i++) {
        var spot = data[i],
            latlng = new naver.maps.LatLng(spot.grd_la, spot.grd_lo),
            marker = new naver.maps.Marker({
                position: latlng,
                draggable: true,
                title: spot.name // 마커 제목 추가
            });

        markers.push(marker);
    }

    var clusterer = new MarkerClustering({
        minClusterSize: 2,
        maxZoom: 8,
        map: map,
        markers: markers,
        disableClickZoom: false,
        gridSize: 120,
        icons: [htmlMarker1, htmlMarker2, htmlMarker3, htmlMarker4, htmlMarker5],
        indexGenerator: [10, 100, 200, 500, 1000],
        stylingFunction: function(clusterMarker, count) {
            $(clusterMarker.getElement()).find('div:first-child').text(count);
        }
    });

    // 클러스터 클릭 이벤트 추가
    naver.maps.Event.addListener(clusterer, 'clusterclick', function(cluster) {
        const markersInCluster = cluster.getMarkers();
        if (markersInCluster.length > 1) {
            const bounds = new naver.maps.LatLngBounds();
            markersInCluster.forEach(marker => bounds.extend(marker.getPosition()));
            
            // 지도 확대 및 애니메이션
            map.panToBounds(bounds, { duration: 500, easing: 'easeOutCubic' });

            // 클러스터 정보 출력
            const markerInfo = markersInCluster.map(marker => marker.getTitle()).join(', ');
            console.log(`클러스터에 포함된 마커: ${markerInfo}`);
        } else {
            console.warn("클러스터에 포함된 마커가 1개 이하입니다.");
        }
    });
}

// 페이지 로드 시 초기화
function initMap() {
    // Firebase 등에서 데이터 로드 후 실행
    fetch('/data/accidentdeath.json')
        .then(response => response.json())
        .then(data => {
            loadCenters(data.accidentDeath.searchResult.accidentDeath);
        })
        .catch(error => console.error('데이터 로드 오류:', error));
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
});
