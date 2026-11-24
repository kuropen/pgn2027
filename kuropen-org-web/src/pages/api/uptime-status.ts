import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { env } from "cloudflare:workers";
import type { PenguinoneOperationalStatus, PhareCurrentStatusApiResponse, PhareMaintenanceWindowApiResponse, UptimeStatusApiResponse } from "../../uptime-status-types";

export const prerender = false;

const getPhareStatusApiUrl = (statusPageId: number) => `https://api.phare.io/uptime/status-pages/${statusPageId}/current-status`
const getMaintenanceWindowApiBaseUrl = 'https://api.phare.io/uptime/maintenance-windows'

export const GET = (async () => {
    const phareApiKey = env.PHARE_API_KEY;
    const statusPagesDefinition = await getCollection('statusPages')
    const statusPagesScanData = statusPagesDefinition.map((def) => ({
        projectId: def.data.phare_pj_id,
        statusPageId: def.data.phare_sp_id,
        projectName: def.data.project_name,
        statusPageUrl: def.data.status_page,
    }))
    const statusPagesCheckPromises = statusPagesScanData.map((scanData) => new Promise<UptimeStatusApiResponse>((resolve) => {
        const statusPageCheckApiUrl = getPhareStatusApiUrl(scanData.statusPageId)
        fetch(statusPageCheckApiUrl, {
            headers: {
                'Authorization': `Bearer ${phareApiKey}`,
                'X-Phare-Project-Id': `${scanData.projectId}`,
            }
        }).then((response) => {
            if (response.ok) {
                response.json<PhareCurrentStatusApiResponse>().then(async (jsonResponse) => {
                    let status: PenguinoneOperationalStatus = jsonResponse.current_incident_impact
                    if (status == 'operational') {
                        // 障害情報がないときはメンテナンス情報がないか探す
                        const getMaintenanceWindowApiUrl = new URL(getMaintenanceWindowApiBaseUrl)
                        getMaintenanceWindowApiUrl.searchParams.append('status_page_id', `${scanData.statusPageId}`)
                        getMaintenanceWindowApiUrl.searchParams.append('state', 'scheduled')
                        const getMaintenanceWindowApiConnection = await fetch(getMaintenanceWindowApiUrl, {
                            headers: {
                                'Authorization': `Bearer ${phareApiKey}`,
                                'X-Phare-Project-Id': `${scanData.projectId}`,
                            },
                        })
                        const getMaintenanceWindowApiResponse = await getMaintenanceWindowApiConnection.json<PhareMaintenanceWindowApiResponse>()
                        if (getMaintenanceWindowApiResponse.data.length > 0) {
                            status = 'maintenance_scheduled'
                        }
                    }
                    resolve({
                        projectName: scanData.projectName,
                        statusPageUrl: scanData.statusPageUrl,
                        status,
                    })
                })
            }
        })
    }))

    return new Response(JSON.stringify(await Promise.all(statusPagesCheckPromises)), {
        headers: {
            "content-type": "application/json",
        }
    });
}) satisfies APIRoute;
