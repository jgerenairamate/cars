// ========================================
// ROADHELP JAVASCRIPT
// ========================================

let map;
let userMarker;
let serviceMarkers = [];


// ========================================
// MAP INITIALIZATION
// ========================================

document.addEventListener("DOMContentLoaded", () => {

    // თბილისის საწყისი მდებარეობა
    map = L.map("map").setView([41.7151, 44.8271], 13);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(map);

});


// ========================================
// USER LOCATION
// ========================================

function getLocation() {

    const status = document.getElementById("status");

    if (!navigator.geolocation) {

        status.innerHTML =
            "❌ თქვენს ბრაუზერს GPS მდებარეობის ფუნქცია არ აქვს.";

        return;
    }

    status.innerHTML =
        "📍 მიმდინარეობს თქვენი მდებარეობის მოძებნა...";

    navigator.geolocation.getCurrentPosition(

        function(position) {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            showUserLocation(latitude, longitude);

            status.innerHTML =
                "✅ თქვენი მდებარეობა წარმატებით მოიძებნა.";

        },

        function(error) {

            console.error(error);

            status.innerHTML =
                "⚠️ მდებარეობის მიღება ვერ მოხერხდა. შეამოწმე GPS ნებართვა.";

        },

        {
            enableHighAccuracy: true,
            timeout: 10000
        }

    );

}


// ========================================
// SHOW USER LOCATION
// ========================================

function showUserLocation(latitude, longitude) {

    if (userMarker) {
        map.removeLayer(userMarker);
    }

    const userIcon = L.divIcon({

        className: "user-location-icon",

        html: `
            <div style="
                width:22px;
                height:22px;
                background:#0878d1;
                border:4px solid white;
                border-radius:50%;
                box-shadow:0 0 0 8px rgba(8,120,209,.20);
            "></div>
        `,

        iconSize: [22, 22],
        iconAnchor: [11, 11]

    });


    userMarker = L.marker(
        [latitude, longitude],
        {
            icon: userIcon
        }
    )
        .addTo(map)
        .bindPopup("<b>📍 შენი მდებარეობა</b>")
        .openPopup();


    map.setView(
        [latitude, longitude],
        14
    );

}


// ========================================
// GET USER COORDINATES
// ========================================

function getUserCoordinates(callback) {

    if (!navigator.geolocation) {

        alert(
            "თქვენს ბრაუზერს მდებარეობის განსაზღვრა არ შეუძლია."
        );

        return;
    }


    navigator.geolocation.getCurrentPosition(

        function(position) {

            callback(
                position.coords.latitude,
                position.coords.longitude
            );

        },

        function() {

            alert(
                "მდებარეობის მიღება ვერ მოხერხდა.\n\n" +
                "გთხოვთ, ბრაუზერში ჩართოთ Location/GPS ნებართვა."
            );

        },

        {
            enableHighAccuracy: true,
            timeout: 10000
        }

    );

}


// ========================================
// SEARCH SERVICE
// ========================================

function searchService(type) {

    getUserCoordinates(
        function(latitude, longitude) {

            showUserLocation(
                latitude,
                longitude
            );

            // OpenStreetMap-ის ძიება
            let searchText = "";

            if (type === "workshop") {
                searchText = "car repair";
            }

            if (type === "gas") {
                searchText = "fuel station";
            }

            if (type === "tire") {
                searchText = "tyre service";
            }

            if (type === "battery") {
                searchText = "car battery service";
            }


            const status =
                document.getElementById("status");

            status.innerHTML =
                "🔎 მიმდინარეობს ახლომდებარე სერვისების ძიება...";


            /*
                Overpass API
                OpenStreetMap-ის მონაცემებიდან
                ახლომდებარე ობიექტების მოძებნა.
            */

            const radius = 5000;

            let query = "";


            if (type === "workshop") {

                query = `
                    [out:json];
                    (
                        node[
                            shop=car_repair
                        ](
                            around:${radius},
                            ${latitude},
                            ${longitude}
                        );

                        way[
                            shop=car_repair
                        ](
                            around:${radius},
                            ${latitude},
                            ${longitude}
                        );
                    );
                    out center;
                `;

            }


            if (type === "gas") {

                query = `
                    [out:json];
                    (
                        node[
                            amenity=fuel
                        ](
                            around:${radius},
                            ${latitude},
                            ${longitude}
                        );

                        way[
                            amenity=fuel
                        ](
                            around:${radius},
                            ${latitude},
                            ${longitude}
                        );
                    );
                    out center;
                `;

            }


            if (type === "tire") {

                query = `
                    [out:json];
                    (
                        node[
                            shop=tyres
                        ](
                            around:${radius},
                            ${latitude},
                            ${longitude}
                        );

                        way[
                            shop=tyres
                        ](
                            around:${radius},
                            ${latitude},
                            ${longitude}
                        );
                    );
                    out center;
                `;

            }


            if (type === "battery") {

                query = `
                    [out:json];
                    (
                        node[
                            shop=car_parts
                        ](
                            around:${radius},
                            ${latitude},
                            ${longitude}
                        );

                        way[
                            shop=car_parts
                        ](
                            around:${radius},
                            ${latitude},
                            ${longitude}
                        );
                    );
                    out center;
                `;

            }


            fetch(
                "https://overpass-api.de/api/interpreter",
                {
                    method: "POST",
                    body: query
                }
            )

            .then(response => response.json())

            .then(data => {

                clearServiceMarkers();

                const results = data.elements || [];


                if (results.length === 0) {

                    status.innerHTML =
                        "😕 ახლომდებარე სერვისი ვერ მოიძებნა.";

                    return;
                }


                // მაქსიმუმ 15 შედეგი
                results
                    .slice(0, 15)
                    .forEach(
                        element => {

                            const lat =
                                element.lat ||
                                element.center?.lat;

                            const lon =
                                element.lon ||
                                element.center?.lon;


                            if (!lat || !lon) {
                                return;
                            }


                            const name =
                                element.tags?.name ||
                                getDefaultName(type);


                            const icon =
                                getServiceIcon(type);


                            const marker =
                                L.marker(
                                    [lat, lon]
                                )
                                .addTo(map);


                            marker.bindPopup(`
                                <div style="
                                    min-width:170px;
                                    font-family:Arial;
                                ">
                                    <h3 style="
                                        margin-bottom:6px;
                                    ">
                                        ${icon} ${name}
                                    </h3>

                                    <p style="
                                        font-size:12px;
                                        color:#666;
                                    ">
                                        ახლომდებარე სერვისი
                                    </p>

                                    <a
                                        href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}"
                                        target="_blank"
                                        style="
                                            display:inline-block;
                                            margin-top:7px;
                                            padding:7px 10px;
                                            background:#0878d1;
                                            color:white;
                                            border-radius:6px;
                                            text-decoration:none;
                                            font-size:12px;
                                        "
                                    >
                                        🧭 ნავიგაცია
                                    </a>
                                </div>
                            `);


                            serviceMarkers.push(marker);

                        }
                    );


                status.innerHTML =
                    `✅ მოიძებნა ${Math.min(results.length, 15)} ახლომდებარე ობიექტი.`;

            })

            .catch(error => {

                console.error(error);

                status.innerHTML =
                    "❌ სერვისების მოძებნა ვერ მოხერხდა.";

            });

        }
    );

}


// ========================================
// SERVICE BUTTONS
// ========================================

function findWorkshop() {

    scrollToMap();

    searchService("workshop");

}


function findGasStation() {

    scrollToMap();

    searchService("gas");

}


function findTireService() {

    scrollToMap();

    searchService("tire");

}


function findBatteryService() {

    scrollToMap();

    searchService("battery");

}


// ========================================
// MAP SCROLL
// ========================================

function scrollToMap() {

    document
        .getElementById("map-section")
        .scrollIntoView({
            behavior: "smooth"
        });

}


// ========================================
// CLEAR MARKERS
// ========================================

function clearServiceMarkers() {

    serviceMarkers.forEach(
        marker => map.removeLayer(marker)
    );

    serviceMarkers = [];

}


// ========================================
// DEFAULT SERVICE NAME
// ========================================

function getDefaultName(type) {

    if (type === "workshop") {
        return "ავტოსახელოსნო";
    }

    if (type === "gas") {
        return "ბენზინგასამართი";
    }

    if (type === "tire") {
        return "საბურავის სერვისი";
    }

    if (type === "battery") {
        return "ავტო სერვისი";
    }

    return "სერვისი";

}


// ========================================
// SERVICE ICON
// ========================================

function getServiceIcon(type) {

    if (type === "workshop") {
        return "🔧";
    }

    if (type === "gas") {
        return "⛽";
    }

    if (type === "tire") {
        return "🛞";
    }

    if (type === "battery") {
        return "🔋";
    }

    return "📍";

}