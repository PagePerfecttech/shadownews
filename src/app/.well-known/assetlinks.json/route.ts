import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const assetlinks = [
    {
      relation: [
        "delegate_permission/common.handle_all_urls",
        "delegate_permission/common.get_login_creds"
      ],
      target: {
        namespace: "android_app",
        package_name: "com.shadownews.app",
        sha256_cert_fingerprints: [
          "1E:29:FA:85:CA:15:D8:29:AF:73:3A:34:84:51:86:E4:09:2E:26:5B:98:23:8C:A9:76:1F:8D:C7:30:3B:FB:65",
          "54:F1:C7:A9:E8:22:98:C1:2F:5C:D4:32:1A:BC:D5:12:34:56:78:9A:BC:DE:F0:12:34:56:78:9A:BC:DE:F0:12",
          "C3:6C:20:EA:C8:EA:AC:99:F5:26:F7:D4:4B:45:FE:7E:C2:DC:EF:08:EC:16:8B:D1:C1:9C:00:E8:18:28:1C:31"
        ]
      }
    }
  ]

  return NextResponse.json(assetlinks, {
    headers: {
      'Content-Type': 'application/json',
    }
  })
}

