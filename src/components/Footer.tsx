export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-sm text-muted-foreground">
          <p>Developed by Page Perfect Tech • All Rights Reserved</p>
          <p className="mt-2">&copy; {currentYear} Shadow News. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
