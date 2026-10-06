import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored pin generator
function createColorPin(color) {
  return L.divIcon({
    className: 'custom-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 10px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

const icons = {
  CRITICAL: createColorPin('#ef4444'),
  HIGH: createColorPin('#f59e0b'),
  MEDIUM: createColorPin('#3b82f6'),
  LOW: createColorPin('#64748b'),
  PINPOINT: createColorPin('#10b981')
};

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 14);
    }
  }, [center, zoom, map]);
  return null;
}

export default function LeafletMap({
  center = [37.7749, -122.4194],
  zoom = 13,
  complaints = [],
  clusters = [],
  selectedPoint = null,
  onLocationSelect = null,
  height = '420px',
  onSelectComplaint = null,
  onSelectCluster = null
}) {
  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-xl" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full dark-map"
        style={{ height: '100%', width: '100%', background: '#090d16' }}
      >
        <ChangeView center={center} zoom={zoom} />
        
        {/* OpenStreetMap Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onLocationSelect && <MapClickHandler onLocationSelect={onLocationSelect} />}

        {/* Selected location marker */}
        {selectedPoint && selectedPoint.latitude && (
          <Marker
            position={[selectedPoint.latitude, selectedPoint.longitude]}
            icon={icons.PINPOINT}
          >
            <Popup className="text-slate-900">
              <div className="text-xs font-semibold text-emerald-700">Selected Incident Location</div>
              <div className="text-[11px] text-slate-600">
                Lat: {selectedPoint.latitude.toFixed(4)}, Lng: {selectedPoint.longitude.toFixed(4)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Cluster Circles & Root Cause Centers */}
        {clusters.map((cl) => (
          <React.Fragment key={cl.id}>
            <Circle
              center={[cl.latitude, cl.longitude]}
              radius={cl.radius_meters || 300}
              pathOptions={{
                color: cl.priority === 'CRITICAL' ? '#ef4444' : cl.priority === 'HIGH' ? '#f59e0b' : '#6366f1',
                fillColor: cl.priority === 'CRITICAL' ? '#ef4444' : cl.priority === 'HIGH' ? '#f59e0b' : '#6366f1',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '4, 6'
              }}
            />
            <Marker
              position={[cl.latitude, cl.longitude]}
              icon={icons[cl.priority] || icons.MEDIUM}
              eventHandlers={{
                click: () => onSelectCluster && onSelectCluster(cl)
              }}
            >
              <Popup className="text-slate-900">
                <div className="p-1">
                  <div className="flex items-center space-x-1.5 mb-1">
                    <span className="text-[10px] uppercase font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                      Root-Cause Cluster ({cl.complaint_count} reports)
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 mb-1">{cl.title}</h4>
                  <p className="text-[11px] text-slate-700 mb-1.5 leading-snug">{cl.root_cause}</p>
                  <div className="text-[10px] text-slate-500">Dept: <strong>{cl.department}</strong></div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* Individual Complaints */}
        {complaints.map((comp) => {
          if (!comp.latitude || !comp.longitude) return null;
          return (
            <Marker
              key={comp.id}
              position={[comp.latitude, comp.longitude]}
              icon={icons[comp.priority] || icons.MEDIUM}
              eventHandlers={{
                click: () => onSelectComplaint && onSelectComplaint(comp)
              }}
            >
              <Popup className="text-slate-900">
                <div className="p-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-800 px-1 rounded">
                      {comp.tracking_id}
                    </span>
                    <span className="text-[10px] font-semibold text-blue-600">{comp.category}</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 mb-1">{comp.title}</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{comp.description}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map legend overlay */}
      <div className="absolute bottom-3 right-3 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-lg text-[11px] text-slate-300 space-y-1 shadow-lg">
        <div className="font-semibold text-slate-200 mb-1 text-[10px] uppercase tracking-wider">Map Legend</div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span>Critical / Hazard</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>High Priority</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span>Medium Priority</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full border border-indigo-400 bg-indigo-500/30"></span>
          <span>Root-Cause Cluster</span>
        </div>
      </div>
    </div>
  );
}
