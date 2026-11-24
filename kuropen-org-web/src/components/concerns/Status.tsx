import { useEffect, useState } from "react";
import type { UptimeStatusApiResponse } from "../../uptime-status-types";
import AlertIcon from "../../assets/icons/alert.svg?react"

type StatusComponentProps = {
    only?: string;
}

export function Status (props: StatusComponentProps) {
    const [statusApiResponse, setStatusApiResponse] = useState<UptimeStatusApiResponse[]>()
    useEffect(() => {
        fetch('/api/uptime-status')
        .then((res) => res.json() as Promise<UptimeStatusApiResponse[]>)
        .then((data) => setStatusApiResponse(data))
    }, [])

    const { only } = props

    const statusesToShow = statusApiResponse?.filter((s) => s.status !== 'operational' && (only ? s.projectName === only : true))

    return (
        <section>
            {
                (statusesToShow?.length || 0) > 0 ? (
                    <div className="my-8 p-4 border border-gray-500 rounded-xl bg-yellow-400 text-black flex flex-row gap-2">
                        <AlertIcon role="presentation" />
                        <div>
                            <h1 className="sr-only">サービスに関するお知らせ</h1>
                            <ul>
                                {
                                    statusesToShow?.map(({projectName, status, statusPageUrl}) => { 
                                        let statusMessage = `${projectName}に障害情報があります。`
                                        if (status == 'maintenance') {
                                            statusMessage = `${projectName}はメンテナンス中です。`
                                        }
                                        if (status == 'maintenance_scheduled') {
                                            statusMessage = `${projectName}にメンテナンス予定があります。`
                                        }
                                        return (
                                            <li key={projectName}>
                                                <a href={statusPageUrl} className="underline" target="_blank" rel="noopener">
                                                    {statusMessage}
                                                </a>
                                            </li>
                                        )
                                    })
                                }
                            </ul>
                        </div>
                    </div>
                ) : ''
            }
            
        </section>
    )
}