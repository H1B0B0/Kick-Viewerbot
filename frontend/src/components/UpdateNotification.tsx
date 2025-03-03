import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import ReactMarkdown from "react-markdown";

interface UpdateNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  version: string;
  releaseNotes: string;
}

export default function UpdateNotification({
  isOpen,
  onClose,
  onDownload,
  version,
  releaseNotes,
}: UpdateNotificationProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      isDismissable={true}
    >
      <ModalContent>
        <ModalHeader>New Version Available! 🚀</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-lg font-medium">
              Version {version} is now available
            </p>
            <div className="bg-default-100 p-4 rounded-lg">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    // Personnalisation des composants markdown
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold mb-4 text-purple-600">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-bold mb-3 text-purple-500">
                        {children}
                      </h2>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-2 my-4">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="flex items-start space-x-2">
                        <span className="mt-1">•</span>
                        <span>{children}</span>
                      </li>
                    ),
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-500 hover:text-purple-600 transition-colors"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {releaseNotes}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="default" variant="light" onPress={onClose}>
            Later
          </Button>
          <Button color="primary" onPress={onDownload}>
            Download Update
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
