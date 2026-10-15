-- Run this in your Supabase SQL Editor to add some fake shops with coordinates in Hyderabad!
INSERT INTO public.dealers (full_name, shop_name, category, phone, address, city, state, pincode, latitude, longitude, rating, business_hours)
VALUES 
('Ramesh Kumar', 'Ramesh Electronics', 'Electronics', '9999911111', 'Ameerpet X Roads', 'Hyderabad', 'Telangana', '500016', 17.4359, 78.4452, 4.5, '9:00 AM - 9:00 PM'),
('Suresh Mobile', 'Suresh Phone Shop', 'Electronics', '9999922222', 'KPHB Colony', 'Hyderabad', 'Telangana', '500072', 17.4834, 78.3871, 4.2, '10:00 AM - 10:00 PM'),
('Anil Tech', 'Anil Gadgets & Phones', 'Electronics', '9999933333', 'Secunderabad Station Road', 'Secunderabad', 'Telangana', '500003', 17.4399, 78.4983, 4.8, '10:00 AM - 8:00 PM'),
('Priya Grocery', 'Priya Supermarket', 'Grocery & FMCG', '9999944444', 'Banjara Hills Rd No 1', 'Hyderabad', 'Telangana', '500034', 17.4156, 78.4357, 4.6, '8:00 AM - 10:00 PM'),
('Kiran Traders', 'Kiran Hardware', 'Hardware', '9999955555', 'Kukatpally', 'Hyderabad', 'Telangana', '500072', 17.4848, 78.4025, 3.9, '9:00 AM - 8:00 PM');
