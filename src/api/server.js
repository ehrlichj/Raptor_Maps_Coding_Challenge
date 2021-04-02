const express = require("express")
const app = express();
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const cors = require('cors');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}))
app.use(cors());

//load data into the server. Ideally this would be stored in a database but this will suffice.
const site_data = require("./api_techician_response_data.json") 


/*
    API ENDPOINT:
    URL: "localhost:5000/api/v1/solar_farms/<solar_farm_id>/techncians"
    ex: "localhost:5000/api/v1/solfar_farm/1/techncians"
             - will send the API response for solar farm
             - If there is corresponding data then will respond a JSON object containing geoJSON data
             - If there is no corresponding data then the following JSON object will be sent:
                            {
                                valid_site_id : (bool)
                            }
*/
app.get("/api/v1/solar_farms/:solar_farm_id/technicians", function(req,res){
    //get solar_farm_id from the request parameters.
    var solar_farm_id = req.params.solar_farm_id;

    //declare and itialize, data, which will be what we will be sending back as the API response.
    let data = "";

    for(let site_iterator = 0; site_iterator<site_data.length; site_iterator++){
        //ID of the current site that we are looking at.
        let cur_site_id = site_data[site_iterator].features[0].properties.id


        //check to see if the site we are looking at matches the request ID parameter.
        if(cur_site_id == solar_farm_id){

            //intialize our response variable 
            data = site_data[site_iterator]
            data["valid_site_id"] = true
            
            //send our response
            res.send(data)

            //we have found the site we are looking for so we can break out of the loop
            break;
        }
    }
    if(data === ""){
        //we never found a site with 
        res.json({"valid_site_id" : false})
    }
    //res.send(data)
})


const port = 5000
app.listen(port, () => console.log("port", port));