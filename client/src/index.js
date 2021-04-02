import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import mapboxgl from 'mapbox-gl/dist/mapbox-gl-csp'
import MapboxWorker from 'worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker'

const fetch = require('node-fetch');
mapboxgl.workerClass = MapboxWorker //needed for mapbox to work with react


mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_API_KEY;

const Map = () => {
    const mapContainer = useRef();
    
    //intialize lng, lat, and zoom
    const[lng,setLng] = useState(-70.9)
    const[lat,setLat] = useState(42.35)
    const[zoom, setZoom] = useState(3)


    //need to keep track of markers on the map for removal
    var current_markers = []

    useEffect(() =>{

        //intialize map
        const map = new mapboxgl.Map({
            container : mapContainer.current,
            style : 'mapbox://styles/mapbox/streets-v11',
            center : [lng, lat],
            zoom: zoom
        });

        //This event occurs after the map has finished loading for the first time.
        map.on('load', () => {

            
            let site_id = 0;
            let delay = 1 * 60 * 1000; //will run 1 every min.

            function handleTechnicianData(){

                    //create fetch url based on site_id parameter
                    let url = "http://localhost:5000/api/v1/solar_farms/" + site_id + "/technicians";           
                    fetch(url)
                        //format response from the api,
                        .then(res => res.json().then(data => ({status: res.status, body: data})))
                        .then(responseObj => {

                            //check res.status
                            if(responseObj.status == 200){
                                //check to see if the site id passed had a corresponding data from the server.
                                if(!responseObj.body.valid_site_id){
                                    let ret = "Invalid Site ID";
                                    return ret
                                }else{
                                    return responseObj.body
                                }
                            }
                            //check to see if the site id passed had a corresponding data from the server.
                           /* if(!responseObj.body.valid_site_id){
                                let ret = "Invalid Site ID";
                                return ret
                            }else{
                                return responseObj.body
                            }*/
                            else{
                                return Promise.reject("Server issue: " + responseObj.status)
                            }
                        })
                        .then(geoData => {
                            console.log(geoData);
    
                            //will need to find 
                            let tech_center = [0,0]
    
                            /*
                                Chained from the previous .then statement. Will run if there was data recieved from the API
                            */
                            if(geoData != "Invalid Site ID"){
    
                                //get geoJSON part from geoData
                                let geoDataFeatures = geoData.features;
    
                                //before adding new markers remove all previous markers.
                                while(current_markers.length > 0){
                                    let marker_to_remove = current_markers.pop()
                                    marker_to_remove.remove();
                                }
    
                                //go through the each technician in the response and add a marker to the map representing them
                                for(var i = 0; i < geoDataFeatures.length; i++){
                                    var popup_marker = new mapboxgl.Popup({ 
                                        offset: [-120, -20],
                                        closeButton: false
                                     }).setText(
                                        "Site: " + site_id + ", Name: " + geoDataFeatures[i].properties.name
                                        );
                                        
                                    let marker = new mapboxgl.Marker({
                                        offset: [-120, 0],
                                        rotation: geoDataFeatures[i].properties.bearing,
                                    })
                                        .setLngLat(geoDataFeatures[i].geometry.coordinates)
                                        .setPopup(popup_marker)
                                        .addTo(map);
                                    
                                    //add new marker to current_markers
                                    current_markers.push(marker)
                                    
    
                                    //sum lats and lons for map center calcualtion
                                    tech_center[0] += geoDataFeatures[i].geometry.coordinates[0]
                                    tech_center[1] += geoDataFeatures[i].geometry.coordinates[1]
                                }
                                
                                //average lons and lats for map center calcualtion
                                tech_center[0] /= geoDataFeatures.length
                                tech_center[1] /= geoDataFeatures.length
            
                                //move the center of the map to the center of the markers.
                                map.flyTo({
                                    center: tech_center,
                                    speed:  1.0,
                                    zoom: 12
                                })
    
                                //check the distances between the technicans for hazardous work conditions
                                let dangerous_technicians = checkTechnicanDistance(geoData, 304.8)
                                let alert_message;
    
                                //if there are hazardous work conditions send an alert
                                if(dangerous_technicians.size > 0){
                                    let alert_message_technicians = ""
                                    for(const tech of dangerous_technicians){
                                        alert_message_technicians += tech + " "
                                    }
                                    alert_message = "Unsafe Conditions\nSite: " +  (site_id).toString() + "\nTechncians: " +  alert_message_technicians
                                    alert(alert_message);
                                }
                            }
                            site_id += 1;
                            
                        })
                        .catch(err => console.log("Error: ", err))
                    }

                    handleTechnicianData();

                    setInterval(handleTechnicianData, delay);
            
            });


        map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
        map.on('move', () =>{
            setLng(map.getCenter().lng.toFixed(4));
            setLat(map.getCenter().lat.toFixed(4));
            setZoom(map.getZoom().toFixed(2));
        });
        return () => map.remove();
    }, []);


     /*
        Checks to see if there are technicians at the site are too close to each other
     */
    function checkTechnicanDistance(siteData, min_distance){

        let dangerous_technicians = new Set()
        let siteFeatures = siteData.features

        const R = 6371e3 //radius of the earth (in meters)

        /*
             - Iterate through all of the technicians at the site and compare them to each other technician at the site.
             - If Technicians are at the site at the same (techician.properties.tsecs)
                    - Compute the Haversine distance between each technician
                    - If each  the Haversine distance between two technicians is < min_distance, add the techicians to dangerous_techinicians Set
        */ 
        for(var t1=0; t1<siteFeatures.length; t1++){
            for(var t2=0; t2<siteFeatures.length; t2++){
                
                //t1, t2 are index pointers for the technicians are the site.
                if(t1 != t2){
                    let technician1 = siteFeatures[t1]
                    let technician2 = siteFeatures[t2]
    
                    let T1_tsec = technician1.properties.tsecs
                    let T2_tsec = technician2.properties.tsecs
    
                    
                    //check to see that the technicians are at the site at tehe same time
                    if(T1_tsec == T2_tsec){

                        //calcualte Haversine distance
                        
                        //get lat and lon coordinates for each technician
                        let T1_lon = technician1.geometry.coordinates[0]
                        let T2_lon = technician2.geometry.coordinates[0]
    
                        let T1_lat = technician1.geometry.coordinates[1]
                        let T2_lat = technician2.geometry.coordinates[1]
                        
                        //convert lat to radians
                        let T1_lat_radians = T1_lat * Math.PI/180
                        let T2_lat_radians = T2_lat * Math.PI/180
                        
                        //calcualte change in lat and change in lon in radians
                        let delta_lat_radians = (T2_lat - T1_lat) * Math.PI/180
                        let delta_lon_radians = (T2_lon - T1_lon) * Math.PI/180
                        
                        //calcualte half the chord length in radians
                        let a = Math.sin(delta_lat_radians/2)  * Math.sin(delta_lat_radians) + 
                                Math.cos(T1_lat_radians) * Math.cos(T2_lat_radians) *
                                Math.sin(delta_lon_radians/2) * Math.sin(delta_lon_radians);
                        
                        //calcualte angluar distance in radians
                        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                        
                        //calcualte final distance
                        let distance = R * c

                        //check if the two technicians are at an unsafe distance
                        if(distance < min_distance){
                            //add at technicans to the dangerous_technicians 
                            dangerous_technicians.add(technician1.properties.name, technician2.properties.name);
                        }
    
                    }
                
    
    
                }
            }
        }
        return dangerous_technicians;
    }

    return(
        <div>
            <div className ="sidebar">
                Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
            </div>
            <div className="map-container" ref={mapContainer} />
        </div>
    );
}
ReactDOM.render(<Map />, document.getElementById('app'));