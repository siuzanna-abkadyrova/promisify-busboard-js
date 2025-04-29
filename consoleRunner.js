import { createInterface } from 'readline';
import { URL } from 'url';
import request from 'request';
import { promisify } from 'util';

// Promisify the request function
const requestPromise = promisify(request);

const readline = createInterface({
    input: process.stdin,
    output: process.stdout
});

const POSTCODES_BASE_URL = 'https://api.postcodes.io';
const TFL_BASE_URL = 'https://api.tfl.gov.uk';

export default class ConsoleRunner {
    async promptForPostcode() {
        const postcode = await new Promise((resolve) => {
            readline.question('\nEnter your postcode: ', (postcode) => {
                readline.close();
                resolve(postcode); 
            });
        });
        return postcode; 
    }

    displayStopPoints(stopPoints) {
        stopPoints.forEach(point => {
            console.log(point.commonName);
        });
    }

    buildUrl(url, endpoint, parameters) {
        const requestUrl = new URL(endpoint, url);
        parameters.forEach(param => requestUrl.searchParams.append(param.name, param.value));
        return requestUrl.href;
    }

    async makeGetRequest(baseUrl, endpoint, parameters, callback) {
        const url = this.buildUrl(baseUrl, endpoint, parameters);

        try {
            const response = await requestPromise(url);
            if (response.statusCode === 200) {
                return response.body;
            } else {
                console.log(response.statusCode);
                return null;
            }
            
          } catch (error) {
            console.log(error);
            return null;
          }
    }

    async getLocationForPostCode(postcode, callback) {
        const responseBody = await this.makeGetRequest(POSTCODES_BASE_URL, `postcodes/${postcode}`, []);
        const jsonBody = JSON.parse(responseBody);

        return { latitude: jsonBody.result.latitude, longitude: jsonBody.result.longitude };
        
    }

    async getNearestStopPoints(latitude, longitude, count, callback) {
        const responseBody = await this.makeGetRequest(
            TFL_BASE_URL,
            `StopPoint`,
            [
                { name: 'stopTypes', value: 'NaptanPublicBusCoachTram' },
                { name: 'lat', value: latitude },
                { name: 'lon', value: longitude },
                { name: 'radius', value: 1000 },
                { name: 'app_id', value: '' /* Enter your app id here */ },
                { name: 'app_key', value: '' /* Enter your app key here */ }
            ]);

        const stopPoints = JSON.parse(responseBody).stopPoints.map(function (entity) {
            return { naptanId: entity.naptanId, commonName: entity.commonName };
        }).slice(0, count);

        return stopPoints;
    }

    async run() {
        const that = this;
        let postcode = await that.promptForPostcode();
        postcode = postcode.replace(/\s/g, '');
        const location = await that.getLocationForPostCode(postcode);
        const stopPoints = await that.getNearestStopPoints(location.latitude, location.longitude, 5);
        that.displayStopPoints(stopPoints);
    }
}