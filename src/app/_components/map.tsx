"use client";

import { useEffect } from "react";

import mapboxgl, { type EventData, type MapLayerEventType } from "mapbox-gl";
// import axios from "axios";
import { type FeatureCollection, type LineString } from "geojson";

const svgArrow = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20">
  <path d="M10 0 L20 20 L10 15 L0 20 Z" fill="#fd3"/>
</svg>
`;

const svgBase64 = btoa(svgArrow);
const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

console.log(dataUrl);

export const Map = () => {
  useEffect(() => {
    mapboxgl.accessToken =
      "pk.eyJ1IjoicmF2ZWJveCIsImEiOiJjbHQxbXhpbnExNHNvMmtvNnhoNm51MGVnIn0.7nDAD5_tZ-p4WT3rMM0jzQ";

    const map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/navigation-night-v1",
      projection: {
        name: "globe",
        // center: [0, 0],
        // scale: 1,
        // translate: [0, 0],
        // rotate: [0, 0, 0],
        // precision: 0
      },
      zoom: 1.5,
      center: [0, 20],
    });

    interface Aircraft {
      lat: number;
      lon: number;
      flight: string;
      alt_baro: number;
      track: number;
      hex: string;
      r: string;
      t: string;
    }

    async function fetchAircraftData(): Promise<Aircraft[]> {
      try {
        const response = await fetch(
          "https://adsbexchange-com1.p.rapidapi.com/v2/lat/51.46888/lon/-35.45536/dist/1000",
          {
            headers: {
              "X-RapidAPI-Key": "tH1gW6Nk257t9qij66pLng56BY0M83tm",
              "X-RapidAPI-Host": "adsbexchange-com1.p.rapidapi.com",
            },
          },
        );
        const responseData = (await response.json()) as { ac: Aircraft[] };
        return responseData.ac;
      } catch (error) {
        console.error("Error fetching aircraft data:", error);
        return [];
      }
    }

    // example response
    // "trace":[
    //     [8210.26,46.153839,-0.176317,38000,445.3,341.8,0,0,null,"adsb_icao",39550,0,246,-0.2],
    //     [8230.08,46.192761,-0.194733,38000,445.6,341.7,0,64,null,"adsb_icao",39550,32,246,-0.3],
    //     [8249.70,46.231155,-0.213028,38000,445.6,341.7,0,0,null,"adsb_icao",39550,0,246,-0.3],
    //     [8269.66,46.270224,-0.231743,38000,446.8,341.6,0,0,{"type":"adsb_icao","flight":"RYR1YR  ","alt_geom":39550,"ias":247,"tas":450,"mach":0.780,"wd":61,"ws":16,"track":341.61,"track_rate":0.00,"roll":-0.18,"mag_heading":342.42,"true_heading":343.60,"baro_rate":0,"geom_rate":0,"squawk":"5541","emergency":"none","category":"A3","nav_qnh":1013.6,"nav_altitude_mcp":38016,"nav_altitude_fms":38000,"nav_heading":340.31,"nic":8,"rc":186,"version":2,"nic_baro":1,"nac_p":11,"nac_v":2,"sil":3,"sil_type":"perhour","gva":2,"sda":2,"alert":0,"spi":0},"adsb_icao",39550,0,247,-0.2],
    //     [8285.79,46.301743,-0.246656,38000,446.9,342.4,0,-64,null,"adsb_icao",39550,-64,246,9.1],
    //     [8292.22,46.314606,-0.251882,38000,447.5,345.4,0,0,null,"adsb_icao",39550,0,247,9.3],

    type TracePoint = [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      unknown,
      string,
      number,
      number,
      number,
      number,
    ];
    type TraceData = { trace: TracePoint[] };

    async function fetchAircraftTrace(hex: string): Promise<LineString | null> {
      try {
        // use https://globe.adsbexchange.com/data/traces/58/trace_recent_4cae58.json
        const lastTwoChars = hex.trim().slice(-2);

        const fullResponse = await fetch(
          `/api/traces/${lastTwoChars}/trace_full_${hex}.json`,
        );
        const recentResponse = await fetch(
          `/api/traces/${lastTwoChars}/trace_recent_${hex}.json`,
        );

        const fullResponseData = (await fullResponse.json()) as TraceData;
        const recentResponseData = (await recentResponse.json()) as TraceData;
        const traceData = fullResponseData.trace.concat(
          recentResponseData.trace,
        );
        console.log(traceData);
        if (traceData && traceData.length > 0) {
          return {
            type: "LineString",
            coordinates: traceData.map((point: TracePoint) => [
              point[2],
              point[1],
            ]),
          };
        }
        return null;
      } catch (error) {
        console.error("Error fetching aircraft trace:", error);
        return null;
      }
    }

    type FeatureProperties = {
      flight: string;
      altitude: number;
      aircraft: string;
      hex: string;
      direction: number;
      type: string;
    };

    function updateMap(aircraft: Aircraft[]) {
      console.log(aircraft);

      const geojson: FeatureCollection = {
        type: "FeatureCollection",
        features: aircraft.map((a) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [a.lon, a.lat],
          },
          properties: {
            flight: a.flight?.trim(),
            hex: a.hex,
            altitude: a.alt_baro,
            aircraft: a.r,
            direction: a.track || 0,
            type: a.t,
          },
        })),
      };

      if (map.getSource("aircraft")) {
        (map.getSource("aircraft") as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.addSource("aircraft", {
          type: "geojson",
          data: geojson,
        });

        // map.addLayer({
        //   id: "aircraft-layer",
        //   type: "circle",
        //   source: "aircraft",
        //   paint: {
        //     "circle-radius": 3,
        //     "circle-color": "#fd3",
        //   },
        // });

        map.loadImage("/plane.png", (error, image) => {
          if (error) throw error;
          map.addImage("arrow-icon", image!);

          map.addLayer({
            id: "aircraft-layer",
            type: "symbol",
            source: "aircraft",
            layout: {
              "icon-image": "arrow-icon",
              "icon-size": 0.02,
              "icon-rotate": ["get", "direction"],
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            },
          });
        });
      }
    }

    map.on("load", () => {
      const refresh = async () => {
        const aircraftData = await fetchAircraftData();
        updateMap(aircraftData);
      };

      //   setInterval(refresh, 10000); // Update every 10 seconds

      void refresh();

      map.addLayer({
        id: "aircraft-labels",
        type: "symbol",
        source: "aircraft",
        layout: {
          "text-field": ["get", "flight"],
          "text-size": 12,
          "text-anchor": "top",
          "text-offset": [0, 0.5],
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      map.setPaintProperty(
        "atmosphere",
        "sky-atmosphere-color",
        "rgba(186, 210, 235, 0.1)",
      );

      map.addLayer({
        id: "atmosphere",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0.0, 0.0],
          "sky-atmosphere-sun-intensity": 1,
        },
      });

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
      });

      map.on("mouseenter", "aircraft-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "aircraft-layer", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("mousemove", "aircraft-layer", (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]!;

          if (feature.geometry.type !== "Point") {
            return;
          }

          const coordinates = feature.geometry.coordinates;
          const properties = feature.properties as FeatureProperties;
          const callsign = properties.flight;
          const altitude = properties.altitude;
          const aircraft = properties.aircraft;

          // Ensure that if the map is zoomed out such that multiple
          // copies of the feature are visible, the popup appears
          // over the copy being pointed to.
          while (Math.abs(e.lngLat.lng - coordinates[0]!) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0]! ? 360 : -360;
          }

          const description = `
        <strong>Callsign:</strong> ${callsign}<br>
        <strong>Altitude:</strong> ${altitude} ft
        <strong>Aircraft:</strong> ${aircraft}
        <strong>Hex:</strong> ${properties.hex}
        <strong>Type:</strong> ${properties.type}
      `;

          popup
            .setLngLat([coordinates[0]!, coordinates[1]!])
            .setHTML(description)
            .addTo(map);
        }
      });

      const click = async (e: MapLayerEventType["click"] & EventData) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]!;
          // const flight = (feature.properties as FeatureProperties)?.flight;
          const hex = (feature.properties as FeatureProperties)?.hex;

          // Remove existing trace layer if present
          if (map.getLayer("aircraft-trace")) {
            map.removeLayer("aircraft-trace");
          }
          if (map.getSource("aircraft-trace")) {
            map.removeSource("aircraft-trace");
          }

          const traceData = await fetchAircraftTrace(hex);

          if (traceData) {
            map.addSource("aircraft-trace", {
              type: "geojson",
              data: traceData,
            });

            map.addLayer({
              id: "aircraft-trace",
              type: "line",
              source: "aircraft-trace",
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": "#f00",
                "line-width": 2,
              },
            });
          }
        }
        return void 0;
      };

      map.on("click", "aircraft-layer", (e) => void click(e));
    });

    // end of useffect
  }, []);

  return (
    <div
      id="map"
      style={{ position: "absolute", top: 0, bottom: 0, width: "100%" }}
    ></div>
  );
};
