# MindBoat + Min-D Deployment Checklist

## Pre-Deployment Checks

### Environment Setup
- [ ] All environment variables configured in `.env`
- [ ] Supabase project is set up and accessible
- [ ] Spline scene URL is configured and working
- [ ] All API keys are valid and have proper permissions

### Code Quality
- [ ] All TypeScript compilation errors resolved
- [ ] Linting passes without errors
- [ ] Build process completes successfully
- [ ] No console errors in development mode

### Database
- [ ] All migrations have been applied to Supabase
- [ ] Row Level Security policies are configured
- [ ] Database tables are accessible with proper permissions
- [ ] Test data can be created and retrieved

### Integration Testing
- [ ] All min-d components render correctly
- [ ] Spline 3D scene loads and responds to interactions
- [ ] Backend services connect properly through adapters
- [ ] User flows work end-to-end (onboarding → journey → voyage → summary)
- [ ] Real-time features function correctly

### Performance
- [ ] Bundle size is optimized
- [ ] Images and assets are optimized
- [ ] Page load times are acceptable
- [ ] Memory usage is within reasonable limits

## Deployment Steps

### Step 1: Final Build
```bash
npm run build
npm run test-integration