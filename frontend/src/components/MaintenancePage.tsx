import { Card } from "@heroui/card";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-10">
        <div className="text-center space-y-8">
          {/* Icon */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 animate-spin-slow">
              <div className="h-24 w-24 rounded-full border-8 border-green-500 border-t-transparent"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-black bg-gradient-to-r from-green-500 to-lime-400 bg-clip-text text-transparent">
            System Maintenance
          </h1>

          {/* Description */}
          <div className="space-y-4">
            <p className="text-xl text-default-600">
              We&apos;re currently improving our services for you
            </p>
            <p className="text-default-500">
              Our team is performing scheduled maintenance to enhance your
              experience. We&apos;ll be back online shortly.
            </p>
          </div>

          {/* Status Updates */}
          <div className="pt-8 space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-default-500">
                Estimated completion time: 15 minutes
              </span>
            </div>
          </div>

          {/* Contact Info */}
          <div className="pt-8 text-sm text-default-400">
            <p>
              Need immediate assistance? Join our{" "}
              <a
                href="https://discord.gg/PwcKMgrY9G" // Remplacez par votre lien d'invitation Discord
                className="text-green-500 hover:text-green-600 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Discord Community{" "}
                <svg
                  className="inline-block w-4 h-4 ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z" />
                </svg>
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
