export default function AppFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-8">
        <p>© {new Date().getFullYear()} Term Supervisor</p>
        <p>Senior Project · Software Engineering Department, University of Business and Technology</p>
      </div>
    </footer>
  );
}
