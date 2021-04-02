# Raptor Maps Coding Challenge

## Instructions

In order to run the project type the following commands into a command line directory. These commands start assuming that current directory is the root folder of this project.

```bash
    cd client
```
```bash
    npm run dev
```

After entering these commands both the server and frontend will begin to run. This should automatically open a browser instance to http://localhost:3000. If this is not the case please navigate there.

## Notes on the Project
 - Once the command "npm run dev" has been entered the project will begin to run on with the backend API at localhost:5000 and the frontend at localhost:3000.
 - After the map is finished rendering, the API is immediatly pinged to get the data for the first solar farm. After that the API is pinged by default every minute. 
 - The API will be continued to be pinged every minute even after the we have gone through all the data in the provided JSON. This is to simulate the situation in which backend could be recieving new data that might need to be received
 - The markers on the map have been rotated according to bearing provided in the JSON data. This may look a bit awkward but it makes it much easier to identify when the markers have changed on the frontend.
 - The markers also have popups attached them which can be open and closed by clicking on the desired marker to see additional information about the marker.
