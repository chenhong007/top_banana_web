export default function LoadingSpinner() {
  return (
    <div className="text-center py-12">
      <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-muted-foreground">加载中...</p>
    </div>
  );
}
