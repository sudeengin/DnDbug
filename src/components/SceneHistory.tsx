interface SceneHistoryProps {
  sceneId: string;
}

export default function SceneHistory({ sceneId }: SceneHistoryProps) {
  return (
    <div className="text-center py-8">
      <div className="text-gray-400 mb-4">
        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Version History</h3>
      <p className="text-gray-600">
        Scene version history will be available here.
      </p>
    </div>
  );
}
