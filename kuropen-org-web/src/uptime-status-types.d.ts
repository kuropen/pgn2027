export type PenguinoneOperationalStatus = PhareIncidentImpact | 'maintenance_scheduled'
export type UptimeStatusApiResponse = {
    projectName: string;
    statusPageUrl: string;
    status: PenguinoneOperationalStatus;
}

export type PhareIncidentImpact = 'unknown' | 'operational' | 'maintenance' | 'degraded_performance' | 'partial_outage' | 'major_outage'
export type PhareCurrentStatusApiResponse = {
    current_incident_impact: PhareIncidentImpact;
    availability: number;
    updated_at: string;
    components: {
        component_type: 'uptime/monitor' | 'uptime/heartbeat';
        component_id: number;
        name: string;
        response_time: number | null;
        availability: number;
        current_incident_impact: PhareIncidentImpact; 
    }[];
    active_incidents: {
        id: number;
        title: string;
        impact: PhareIncidentImpact;
        status: 'ongoing' | 'recovering' | 'recovered';
        exclude_from_downtime: boolean;
        incident_at: string | null;
        recovery_at: string | null;
    }[];
}
export type PhareMaintenanceWindowApiResponse = {
    data: {
        monitoring_mode: 'pause' | 'mute' | 'normal';
        title: string;
        starts_at: string;
        ends_at: string;
        id: number;
        project_id: number;
        state: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
        description: string | null;
        monitors: number[];
        heartbeats: number[];
        status_pages: number[] | null;
        tags: string[] | null;
        created_at: string;
        updated_at: string;
    }[];
    meta: {
        current_page: number;
        from: number | null;
        to: number | null;
        per_page: number;
        path: string;
    };
    links: {
        first: string;
        last: string | null;
        prev: string | null;
        next: string | null;
    }
}
