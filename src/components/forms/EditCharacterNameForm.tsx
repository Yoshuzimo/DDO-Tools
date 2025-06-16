const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  if (!user || !character) {
    toast({
      title: 'Error',
      description: 'User or character data missing.',
      variant: 'destructive',
    });
    return;
  }

  const formData = new FormData(event.currentTarget);
  formData.set('userId', user.uid);
  formData.set('characterId', character.id);

  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('No current user.');
    }

    const token = await currentUser.getIdToken();
    formData.set('token', token);

    formAction(formData);
  } catch (error) {
    toast({
      title: 'Auth Error',
      description: 'Unable to get ID token. Please log in again.',
      variant: 'destructive',
    });
    router.push('/auth/login');
  }
};
