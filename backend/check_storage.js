import { supabase } from './db/supabase.js';

async function checkStorage() {
    console.log('Checking Supabase Storage buckets...');
    try {
        const { data, error } = await supabase.storage.listBuckets();

        if (error) {
            console.error('Error listing buckets:', error.message);
            return;
        }

        const avatarBucket = data.find(b => b.name === 'avatars');

        if (avatarBucket) {
            console.log('✅ "avatars" bucket found!');
            console.log('Public:', avatarBucket.public);
        } else {
            console.log('❌ "avatars" bucket NOT found.');
            console.log('Please create a public bucket named "avatars" in your Supabase Dashboard.');
        }

        console.log('Available buckets:', data.map(b => b.name).join(', '));
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkStorage();
