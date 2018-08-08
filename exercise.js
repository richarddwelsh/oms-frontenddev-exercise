
let countryData, sourceData, data = {};

// define some shorter identifiers for the commodity categories (used in CSS classnames, etc.)
let categories = {
    "CerGr": {
        label: "Cereals and Grains"
    },
    "Pulses": {
        label: "Pulses"
    },
    "StaRoo": {
        label: "Starchy Roots"
    },
    "Sugar": {
        label: "Sugar"
    },
    "OilFat": {
        label: "Oils & Fats"
    },
    "Meat": {
        label: "Meat"
    },
    "DairEgg": {
        label: "Dairy & Eggs"
    },
    "FrVeg": {
        label: "Fruit and Vegetables"
    },
    "Other": {
        label: "Other"
    },
    "Alcol": {
        label: "Alcoholic Beverages"
    }
}

let suffix = "(FAO (2017)) (kilocalories per person per day)";

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
            if (!(data.hasOwnProperty(row.Entity))) {
                data[row.Entity] = {
                    dietCompData: {},
                    geoFeature: countryData.features.find(f => f.properties.name == row.Entity) // mapping on country name, hope this works
                };
            }

            // each year row is transformed into an associative array using the category IDs from categories above
            data[row.Entity].dietCompData[row.Year] = {};
            for (var catId in categories) {
                data[row.Entity].dietCompData[row.Year][catId] = row[categories[catId].label + " " + suffix]; 
            }

            // the above can also be achieved using all sorts of new ES6 features, below (not sure if this is more or less readable!)
            //data[row.Entity].dietCompData[row.Year] = Object.assign({}, ...Object.keys(categories).map(catId => ({[catId]: row[categories[catId].label + " " + suffix] })))
        });

       // plot the map
       // lots of this is adapted from https://bl.ocks.org/andybarefoot/765c937c8599ef540e1e0b394ca89dc5 
        
        // DEFINE VARIABLES
        // Define size of map group
        // Full world map is 2:1 ratio
        // Using 12:5 because we will crop top and bottom of map
        w = 1000;
        h = 5/12*1000;
        // variables for catching min and max zoom factors
        var minZoom;
        var maxZoom;

        // DEFINE FUNCTIONS/OBJECTS
        // Define map projection
        var projection = d3
        .geoEquirectangular()
        .center([0, 15]) // set centre to further North as we are cropping more off bottom of map
        .scale([w / (2 * Math.PI)]) // scale to fit group width
        .translate([w / 2, h / 2]) // ensure centred in group
        ;

        // Define map path
        var path = d3
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
        var zoom = d3
        .zoom()
        .on("zoom", zoomed)
        ;

        let svg = d3.select("#map-holder")
            .attr("width", w)
            .attr("height", h)
            .call(zoom);

        let countriesGroup = svg.append("g").attr("id", "map");
        // add a background rectangle
        countriesGroup
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", w)
            .attr("height", h);


        // DATA JOIN
        let countries = countriesGroup
            .selectAll("path")
            .data(Object.values(data)); // note D3 works with Arrays, not Objects!
        
        // ENTER (what to do when creating new elements)
        let countriesEnter = countries
            .enter()
            .append("path")
            // .attr("d", d => path(d.geoFeature))
            .attr("id", function(d, i) {
              return "country" + d.geoFeature.properties.iso_a3;
            })
            .attr("class", "country");
    })
