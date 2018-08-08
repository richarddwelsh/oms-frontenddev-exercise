
let countryData, sourceData, data = {};

let path; // D3 map projection function
let countriesGroup; // D3 selection

// define some shorter identifiers for the commodity categories (used in CSS classnames, etc.)
let categories = {
    "CerGr": {
        label: "Cereals and Grains", hue: 0,
    },
    "Pulses": {
        label: "Pulses", hue: 36,
    },
    "StaRoo": {
        label: "Starchy Roots", hue: 72,
    },
    "Sugar": {
        label: "Sugar", hue: 108,
    },
    "OilFat": {
        label: "Oils & Fats", hue: 144,
    },
    "Meat": {
        label: "Meat", hue: 180,
    },
    "DairEgg": {
        label: "Dairy & Eggs", hue: 216,
    },
    "FrVeg": {
        label: "Fruit and Vegetables", hue: 252,
    },
    "Other": {
        label: "Other", hue: 288,
    },
    "Alcol": {
        label: "Alcoholic Beverages", hue: 324
    }
};

let suffix = "(FAO (2017)) (kilocalories per person per day)";

// UN FAO names don't all map to names in map data
let nameMappings = {
    "Antigua and Barbuda" : "Antigua and Barb.",
    "Bosnia and Herzegovina": "Bosnia and Herz.",
    "Cabo Verde": "Cape Verde",
    "Central African Republic": "Central African Rep.",
    "Cote d'Ivoire": "Côte d'Ivoire",
    "Czech Republic": "Czech Rep.",
    "Czechoslovakia": "Czech Rep.", // ["Czech Rep.", "Slovakia"], // split in 1993
    "Dominican Republic": "Dominican Rep.",
    "French Polynesia": "Fr. Polynesia",
    "Laos": "Lao PDR",
    "North Korea": "Dem. Rep. Korea",
    "Saint Kitts and Nevis" : "St. Kitts and Nevis",
    "Saint Vincent and the Grenadines": "St. Vin. and Gren.",
    "Sao Tome and Principe": "São Tomé and Principe",
    "Serbia and Montenegro": "Serbia", // ["Serbia", "Montenegro"], // split in 2006
    "Solomon Islands": "Solomon Is.",
    "South Korea": "Korea",
    "USSR": "Russia" // not an accurate mapping I know but it'll do
};

// initial seelections
let catSelect = "Alcol";
let yearSelect = 2000;


// main code block will run when both source data sets have been retrieved
Promise.all([
    d3.json("https://raw.githubusercontent.com/andybarefoot/andybarefoot-www/master/maps/mapdata/custom50.json"), // country outline data
    d3.csv("diet-compositions-by-commodity-categories-fao-2017.csv") // supplied diet composition data
])
    .then(loadedData => {
        countryData = loadedData[0];
        sourceData = loadedData[1];

        // iterate over diet composition data, creating an object with one property per country. Each country property has an array of diet composition data and geographical data
        sourceData.forEach(row => {

            // handle spelling differences between UN FAO and geographical data
            let geoCountryName = nameMappings[row.Entity] || row.Entity;

            if (!(data.hasOwnProperty(geoCountryName))) {
                data[geoCountryName] = {
                    dietCompData: {},
                    geoFeature: countryData.features.find(f => f.properties.name == geoCountryName) // mapping on country name, hope this works
                };
            }

            // each year row is transformed into an associative array using the category IDs from categories above
            if (!(data[geoCountryName].dietCompData[row.Year])) {
                data[geoCountryName].dietCompData[row.Year] = {};
            }

            for (var catId in categories) {
                data[geoCountryName].dietCompData[row.Year][catId] = Number(row[categories[catId].label + " " + suffix]); 
            }

            // the above can also be achieved using all sorts of new ES6 features, below (not sure if this is more or less readable!)
            //data[geoCountryName].dietCompData[row.Year] = Object.assign({}, ...Object.keys(categories).map(catId => ({[catId]: row[categories[catId].label + " " + suffix] })))
        });

        // calculate min/max ranges for each category
        for (var catId in categories) {
            let allData = sourceData.map(row => Number(row[categories[catId].label + " " + suffix]));

            categories[catId].min = d3.min(allData);
            categories[catId].max = d3.max(allData);
        }


       // plot the map
       // lots of this is adapted from https://bl.ocks.org/andybarefoot/765c937c8599ef540e1e0b394ca89dc5 
        
        // DEFINE VARIABLES
        // Define size of map group
        // Full world map is 2:1 ratio
        // Using 12:5 because we will crop top and bottom of map
        w = 1000;
        h = 5/12*1000;

        // DEFINE FUNCTIONS/OBJECTS
        // Define map projection
        let projection = d3
        .geoEquirectangular()
        .center([0, 15]) // set centre to further North as we are cropping more off bottom of map
        .scale([w / (2 * Math.PI)]) // scale to fit group width
        .translate([w / 2, h / 2]) // ensure centred in group
        ;

        // Define map path
        path = d3
            .geoPath()
            .projection(projection)
        ;

        // Create function to apply zoom to countriesGroup
        function zoomed() {
        t = d3
            .event
            .transform
        ;
        countriesGroup
            .attr("transform","translate(" + [t.x, t.y] + ")scale(" + t.k + ")")
        ;
        }

        // Define map zoom behaviour
        let zoom = d3
        .zoom()
        .on("zoom", zoomed)
        ;

        let svg = d3.select("#map-holder")
            .attr("width", w)
            .attr("height", h)
            .call(zoom);

        countriesGroup = svg.append("g").attr("id", "map");
        // add a background rectangle
        countriesGroup
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", w)
            .attr("height", h);

        drawMap(yearSelect, catSelect);
    })

function drawMap(year, category) {
        // DATA JOIN
        let countries = countriesGroup
            .selectAll("path")
            .data(Object.values(data)); // note D3 works with Arrays, not Objects!
        
        // ENTER (what to do when creating new elements)
        let countriesEnter = countries
            .enter()
            .append("path")
            .attr("d", d => path(d.geoFeature))
            .attr("id", function(d, i) {
              return "country" + d.geoFeature.properties.iso_a3;
            })
            .attr("class", "country")
            .on("click", countryClickHandler)
            .on("mouseover", countryMouseoverHandler)
            .on("mouseout", countryMouseoutHandler);

        // ENTER + UPDATE (what to do when creating OR updating data elements) - update => change fill colour of country
        countries.merge(countriesEnter)
            .attr("fill", d => {
                if (d.dietCompData[yearSelect] && d.dietCompData[yearSelect][catSelect]) {
                    let pc = d.dietCompData[yearSelect][catSelect] * 100 / categories[catSelect].max ;
                    return `hsl(${categories[catSelect].hue},75%,${Math.floor(100 - pc)}%)`;
                }
                else
                    return "hsl(0, 0%, 70%)"
            })
}

function countryClickHandler(d, i) {
    //console.log(d.properties.name)
}

function countryMouseoverHandler(d, i) {
    //console.log(d.properties.name)
}

function countryMouseoutHandler(d, i) {
    //console.log(d.properties.name)
}